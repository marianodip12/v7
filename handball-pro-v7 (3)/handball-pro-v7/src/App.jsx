import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase.js";

// ═══════════════════════════════════════════════════
//  THEME
// ═══════════════════════════════════════════════════
const T = {
  bg:"#060c18", card:"#0d1526", card2:"#111e35",
  accent:"#3b82f6", cyan:"#06b6d4",
  green:"#22c55e", red:"#ef4444", yellow:"#f59e0b",
  orange:"#f97316", purple:"#8b5cf6",
  text:"#e2e8f0", muted:"#64748b", border:"#1a2d4a",
  font:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
};

// ═══════════════════════════════════════════════════
//  DATA CONSTANTS
// ═══════════════════════════════════════════════════
const ZONES = {
  left_wing:  { label:"Extremo Izq.", short:"EI", emoji:"◀", color:"#06b6d4",
    path:"M 0 0 L 56 0 A 84 84 0 0 1 67 42 L 31 63 A 126 126 0 0 0 14 0 Z", lx:22, ly:34 },
  left_back:  { label:"Back Izq.",   short:"LI", emoji:"↖", color:"#8b5cf6",
    path:"M 67 42 A 84 84 0 0 1 98 73 L 77 109 A 126 126 0 0 0 31 63 Z",    lx:53, ly:74 },
  center:     { label:"Central",     short:"CE", emoji:"↑", color:"#f59e0b",
    path:"M 98 73 A 84 84 0 0 1 182 73 L 203 109 A 126 126 0 0 0 77 109 Z", lx:140,ly:90 },
  right_back: { label:"Back Der.",   short:"LD", emoji:"↗", color:"#8b5cf6",
    path:"M 182 73 A 84 84 0 0 1 213 42 L 249 63 A 126 126 0 0 0 203 109 Z",lx:223,ly:74 },
  right_wing: { label:"Extremo Der.",short:"ED", emoji:"▶", color:"#06b6d4",
    path:"M 280 0 L 224 0 A 84 84 0 0 0 213 42 L 249 63 A 126 126 0 0 1 266 0 Z",lx:256,ly:34},
  pivot:      { label:"Pivote",      short:"PI", emoji:"⬟", color:"#ef4444",
    path:"M 98 73 A 84 84 0 0 1 182 73 L 140 0 Z",                          lx:140,ly:50 },
};

// 9 quadrants: top-left→top-right, mid, bottom (goalkeeper's perspective)
const QUADRANTS = [
  { id:0, label:"Sup Izq",  icon:"↖", row:0, col:0 },
  { id:1, label:"Sup Cen",  icon:"↑", row:0, col:1 },
  { id:2, label:"Sup Der",  icon:"↗", row:0, col:2 },
  { id:3, label:"Med Izq",  icon:"←", row:1, col:0 },
  { id:4, label:"Centro",   icon:"●", row:1, col:1 },
  { id:5, label:"Med Der",  icon:"→", row:1, col:2 },
  { id:6, label:"Inf Izq",  icon:"↙", row:2, col:0 },
  { id:7, label:"Inf Cen",  icon:"↓", row:2, col:1 },
  { id:8, label:"Inf Der",  icon:"↘", row:2, col:2 },
];

const EV_TYPES = {
  goal:        { label:"Gol",          icon:"⚽", color:"#22c55e" },
  miss:        { label:"Tiro errado",  icon:"❌", color:"#64748b" },
  saved:       { label:"Atajada",      icon:"🧤", color:"#60a5fa" },
  turnover:    { label:"Pérdida",      icon:"🔄", color:"#94a3b8" },
  timeout:     { label:"T. Muerto",    icon:"⏸", color:"#f59e0b" },
  exclusion:   { label:"Exclusión 2'", icon:"⏱", color:"#f97316" },
  red_card:    { label:"Tarjeta Roja", icon:"🟥", color:"#ef4444" },
  blue_card:   { label:"Tarjeta Azul", icon:"🟦", color:"#3b82f6" },
  yellow_card: { label:"Amarilla",     icon:"🟨", color:"#f59e0b" },
  half_time:   { label:"Descanso",     icon:"🔔", color:"#8b5cf6" },
};

const DISC_TYPES = ["timeout","exclusion","red_card","blue_card","yellow_card"];

// ── NUEVAS CONSTANTES DE ANÁLISIS ──
const DISTANCES = [
  {k:"6m",    l:"6m",         emoji:"🟢"},
  {k:"9m",    l:"9m",         emoji:"🟡"},
  {k:"12m",   l:"12m",        emoji:"🟠"},
  {k:"penal", l:"Penal 7m",   emoji:"⚪"},
  {k:"arco",  l:"Arco-Arco",  emoji:"🔴"},
];
const SITUATIONS = [
  {k:"igualdad",     l:"Igualdad",    emoji:"⚖️",  color:"#64748b"},
  {k:"superioridad", l:"Superioridad",emoji:"📈",  color:"#22c55e"},
  {k:"inferioridad", l:"Inferioridad",emoji:"📉",  color:"#ef4444"},
];
const THROW_TYPES = [
  {k:"salto",       l:"Salto",       emoji:"🦘"},
  {k:"habilidad",   l:"Habilidad",   emoji:"🤸"},
  {k:"finta",       l:"Finta",       emoji:"🌀"},
  {k:"penetracion", l:"Penetración", emoji:"🏃"},
  {k:"otro",        l:"Otro",        emoji:"❓"},
];

const INIT_TEAMS = [
  { id:1, name:"GEI", color:"#ef4444", wins:8, losses:2, draws:1,
    players:[
      {id:1, name:"García",    number:1,  pos:"Arquero"},
      {id:2, name:"López",     number:5,  pos:"Armador"},
      {id:3, name:"Martínez",  number:7,  pos:"Extremo Izq."},
      {id:4, name:"Pérez",     number:9,  pos:"Pivote"},
      {id:5, name:"Rodríguez", number:11, pos:"Lateral Izq."},
      {id:6, name:"Torres",    number:13, pos:"Extremo Der."},
      {id:7, name:"Morales",   number:5,  pos:"Armador"},
      {id:8, name:"Ríos",      number:4,  pos:"Lateral Der."},
      {id:9, name:"Vera",      number:9,  pos:"Pivote"},
      {id:10,name:"Ruiz",      number:6,  pos:"Lateral Izq."},
    ]},
  { id:2, name:"Bernal", color:"#3b82f6", wins:6, losses:4, draws:1,
    players:[
      {id:11,name:"Sosa",    number:2,  pos:"Arquero"},
      {id:12,name:"Ibáñez",  number:7,  pos:"Extremo Izq."},
      {id:13,name:"Herrera", number:3,  pos:"Lateral Der."},
      {id:14,name:"Meza",    number:11, pos:"Pivote"},
      {id:15,name:"Castro",  number:8,  pos:"Armador"},
      {id:16,name:"Acosta",  number:10, pos:"Lateral Izq."},
      {id:17,name:"Vega",    number:14, pos:"Extremo Der."},
    ]},
];

const DEMO_EVENTS = [
  { id:1, min:4,  team:"home", type:"goal",  zone:"left_back",  quadrant:1,
    shooter:{name:"Morales",number:5}, goalkeeper:{name:"Sosa",number:2},
    hScore:1, aScore:0 },
  { id:2, min:7,  team:"away", type:"goal",  zone:"right_wing", quadrant:2,
    shooter:{name:"Ibáñez",number:7}, goalkeeper:{name:"García",number:1},
    hScore:1, aScore:1 },
  { id:3, min:11, team:"home", type:"exclusion", zone:null, quadrant:null,
    sanctioned:{name:"Torres",number:13}, cardType:"exclusion",
    hScore:1, aScore:1 },
  { id:4, min:13, team:"away", type:"goal",  zone:"center",    quadrant:4,
    shooter:{name:"Herrera",number:3}, goalkeeper:{name:"García",number:1},
    hScore:1, aScore:2 },
  { id:5, min:15, team:"home", type:"timeout", zone:null, quadrant:null,
    hScore:1, aScore:2 },
  { id:6, min:16, team:"home", type:"saved", zone:"left_back",  quadrant:0,
    shooter:{name:"López",number:5}, goalkeeper:{name:"Sosa",number:2},
    hScore:1, aScore:2 },
  { id:7, min:18, team:"home", type:"goal",  zone:"pivot",     quadrant:3,
    shooter:{name:"Vera",number:9}, goalkeeper:{name:"Sosa",number:2},
    hScore:2, aScore:2 },
  { id:8, min:22, team:"away", type:"yellow_card", zone:null, quadrant:null,
    sanctioned:{name:"Meza",number:11}, cardType:"yellow_card",
    hScore:2, aScore:2 },
  { id:9, min:24, team:"home", type:"goal",  zone:"right_back", quadrant:2,
    shooter:{name:"Ruiz",number:6}, goalkeeper:{name:"Sosa",number:2},
    hScore:3, aScore:2 },
  { id:10,min:27, team:"away", type:"miss",  zone:"left_wing",  quadrant:6,
    shooter:{name:"Ibáñez",number:7}, goalkeeper:{name:"García",number:1},
    hScore:3, aScore:2 },
  { id:11,min:30, team:null,   type:"half_time", hScore:5, aScore:3 },
  { id:12,min:36, team:"home", type:"exclusion", zone:null, quadrant:null,
    sanctioned:{name:"Ríos",number:4}, cardType:"exclusion",
    hScore:5, aScore:4 },
  { id:13,min:44, team:"away", type:"red_card", zone:null, quadrant:null,
    sanctioned:{name:"Castro",number:8}, cardType:"red_card",
    hScore:6, aScore:5 },
  { id:14,min:46, team:"home", type:"goal",  zone:"pivot",     quadrant:7,
    shooter:{name:"Vera",number:9}, goalkeeper:{name:"Sosa",number:2},
    hScore:7, aScore:5 },
  { id:15,min:52, team:"home", type:"blue_card", zone:null, quadrant:null,
    sanctioned:{name:"López",number:5}, cardType:"blue_card",
    hScore:7, aScore:6 },
  { id:16,min:60, team:"home", type:"goal",  zone:"left_back",  quadrant:1,
    shooter:{name:"Morales",number:5}, goalkeeper:{name:"Sosa",number:2},
    hScore:10, aScore:6 },
];

// ═══════════════════════════════════════════════════
//  SHARED ATOMS
// ═══════════════════════════════════════════════════
function Card({children,style={}}) {
  return (
    <div style={{background:T.card,borderRadius:14,border:`1px solid ${T.border}`,overflow:"hidden",...style}}>
      {children}
    </div>
  );
}
function Badge({label,color}) {
  return (
    <span style={{background:color+"22",color,border:`1px solid ${color}44`,
      borderRadius:20,padding:"2px 9px",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>
      {label}
    </span>
  );
}
function SectionLabel({children}) {
  return <div style={{fontSize:10,color:T.muted,letterSpacing:1.5,fontWeight:600,marginBottom:8,textTransform:"uppercase"}}>{children}</div>;
}

// ═══════════════════════════════════════════════════
//  QUADRANT GOAL PICKER
// ═══════════════════════════════════════════════════
function QuadrantPicker({value, onChange, resultColor}) {
  const qColor = (id) => {
    if(value === id) return resultColor || T.accent;
    return "transparent";
  };
  return (
    <div>
      <SectionLabel>DESTINO DEL TIRO (arco del arquero)</SectionLabel>
      {/* Goal frame */}
      <div style={{background:"#081828",borderRadius:10,padding:"10px 8px",border:`1px solid ${T.border}`,position:"relative"}}>
        {/* Posts */}
        <div style={{position:"absolute",top:6,left:8,right:8,height:3,background:"#fff",borderRadius:2,zIndex:3}}/>
        <div style={{position:"absolute",top:6,bottom:6,left:8,width:3,background:"#fff",borderRadius:2,zIndex:3}}/>
        <div style={{position:"absolute",top:6,bottom:6,right:8,width:3,background:"#fff",borderRadius:2,zIndex:3}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,padding:"12px 14px 6px"}}>
          {QUADRANTS.map(q=>{
            const sel = value===q.id;
            const bc = sel?(resultColor||T.accent):"rgba(255,255,255,0.08)";
            return (
              <button key={q.id} onClick={()=>onChange(q.id)}
                style={{
                  background: sel?(resultColor||T.accent)+"28":"rgba(255,255,255,0.04)",
                  border:`1.5px solid ${bc}`,
                  borderRadius:8,padding:"10px 4px",cursor:"pointer",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:3,
                  transition:"all .15s",
                }}>
                <span style={{fontSize:16,opacity:sel?1:.4}}>{q.icon}</span>
                <span style={{fontSize:8,color:sel?(resultColor||T.accent):T.muted,fontWeight:sel?700:400}}>{q.label}</span>
              </button>
            );
          })}
        </div>
        <div style={{textAlign:"center",fontSize:9,color:"rgba(255,255,255,.2)",marginTop:2}}>
          Vista frontal del arco
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  MINI COURT (tap zone)
// ═══════════════════════════════════════════════════
function MiniCourt({onZoneClick, selZone, heatCounts}) {
  const [hov,setHov]=useState(null);
  const maxC = Math.max(...Object.values(heatCounts||{}),1);
  return (
    <div style={{background:"#0f2a5a",borderRadius:14,padding:"10px 8px",border:"1px solid #1e407a"}}>
      <div style={{fontSize:9,color:"rgba(255,255,255,.35)",textAlign:"center",marginBottom:6,letterSpacing:1}}>
        TOCÁ LA ZONA DE LANZAMIENTO
      </div>
      <svg viewBox="-8 -28 296 185" width="100%" preserveAspectRatio="xMidYMid meet" style={{display:"block",maxWidth:340,margin:"0 auto"}}>
        <rect x="-8" y="-28" width="296" height="185" fill="#0f2a5a" rx="8"/>
        <rect x="0" y="0" width="280" height="155" fill="#2196c4" rx="4"/>
        <path d="M 56 0 A 84 84 0 0 1 224 0 Z" fill="#1565a0"/>
        {Object.entries(ZONES).map(([key,zone])=>{
          const c=heatCounts?.[key]||0;
          const alpha=c?Math.min(0.72,0.18+c/maxC*0.54):0;
          const isSelected=selZone===key;
          return (
            <path key={key} d={zone.path}
              fill={isSelected?zone.color+"55":c?zone.color+Math.round(alpha*255).toString(16).padStart(2,"0"):"rgba(255,255,255,0.04)"}
              stroke={isSelected?"#fff":hov===key?"rgba(255,255,255,.5)":"rgba(255,255,255,.15)"}
              strokeWidth={isSelected?2.5:hov===key?1.5:1}
              style={{cursor:"pointer",transition:"all .15s"}}
              onMouseEnter={()=>setHov(key)} onMouseLeave={()=>setHov(null)}
              onClick={()=>onZoneClick(key)}
            />
          );
        })}
        <rect x="0" y="0" width="280" height="155" fill="none" stroke="white" strokeWidth="2" rx="4"/>
        <path d="M 56 0 A 84 84 0 0 1 224 0" fill="none" stroke="white" strokeWidth="2"/>
        <path d="M 14 0 A 126 126 0 0 1 266 0" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="7 4" opacity=".8"/>
        <circle cx="140" cy="98" r="3" fill="white"/>
        <line x1="67" y1="42" x2="31" y2="63" stroke="white" strokeWidth="1.2" opacity=".5"/>
        <line x1="98" y1="73" x2="77" y2="109" stroke="white" strokeWidth="1.2" opacity=".5"/>
        <line x1="182" y1="73" x2="203" y2="109" stroke="white" strokeWidth="1.2" opacity=".5"/>
        <line x1="213" y1="42" x2="249" y2="63" stroke="white" strokeWidth="1.2" opacity=".5"/>
        <line x1="98" y1="73" x2="140" y2="0" stroke="white" strokeWidth="1" opacity=".3" strokeDasharray="3 3"/>
        <line x1="182" y1="73" x2="140" y2="0" stroke="white" strokeWidth="1" opacity=".3" strokeDasharray="3 3"/>
        <rect x="119" y="-22" width="42" height="22" fill="#081220" stroke="white" strokeWidth="2" rx="2"/>
        <text x="140" y="-8" textAnchor="middle" fill="rgba(255,255,255,.4)" fontSize="6.5" fontWeight="700">ARCO</text>
        {Object.entries(ZONES).map(([key,zone])=>(
          <text key={`l${key}`} x={zone.lx} y={zone.ly} textAnchor="middle"
            fill={selZone===key?"#fff":"rgba(255,255,255,.65)"} fontSize="9.5" fontWeight="700"
            style={{pointerEvents:"none"}}>
            {zone.short}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  PLAYER PICKER
// ═══════════════════════════════════════════════════
function PlayerPicker({players,value,onChange,label,accent}) {
  const col = accent||T.accent;
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {players.map(p=>{
          const sel=value===p.name;
          return (
            <button key={p.id} onClick={()=>onChange(p.name)}
              style={{background:sel?col+"22":T.card2,color:sel?col:T.muted,
                border:`1px solid ${sel?col:T.border}`,borderRadius:9,
                padding:"7px 10px",fontWeight:700,fontSize:11,cursor:"pointer",
                transition:"all .15s",display:"flex",alignItems:"center",gap:5}}>
              <span style={{background:sel?col+"33":"rgba(255,255,255,.06)",
                borderRadius:5,padding:"1px 5px",fontSize:10,fontWeight:800,color:sel?col:T.muted}}>
                #{p.number}
              </span>
              {p.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  SCORE CHART
// ═══════════════════════════════════════════════════
function ScoreChart({events,homeColor,awayColor}) {
  const W=320,H=120,PAD=28;
  const pts=[{min:0,hScore:0,aScore:0},...events.filter(e=>e.hScore!=null)];
  const maxScore=Math.max(...pts.map(p=>Math.max(p.hScore,p.aScore)),1);
  const px=m=>PAD+(m/60)*(W-PAD*2);
  const py=s=>H-PAD-(s/maxScore)*(H-PAD*2);
  let hPath=`M ${px(0)} ${py(0)}`;
  let aPath=`M ${px(0)} ${py(0)}`;
  pts.forEach((p,i)=>{if(i>0){hPath+=` L ${px(p.min)} ${py(p.hScore)}`;aPath+=` L ${px(p.min)} ${py(p.aScore)}`;}});
  const half=events.find(e=>e.type==="half_time");
  return (
    <div style={{overflowX:"auto"}}>
      <svg width={W} height={H} style={{display:"block",margin:"0 auto"}}>
        <defs>
          <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={homeColor} stopOpacity="0.22"/><stop offset="100%" stopColor={homeColor} stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={awayColor} stopOpacity="0.18"/><stop offset="100%" stopColor={awayColor} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0,15,30,45,60].map(m=>(
          <g key={m}>
            <line x1={px(m)} y1={PAD-4} x2={px(m)} y2={H-PAD} stroke={T.border} strokeWidth="1" strokeDasharray="3 3"/>
            <text x={px(m)} y={H-6} textAnchor="middle" fill={T.muted} fontSize="8">{m}'</text>
          </g>
        ))}
        {half&&<line x1={px(half.min)} y1={PAD-4} x2={px(half.min)} y2={H-PAD} stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 3"/>}
        <path d={hPath+` L ${px(pts[pts.length-1].min)} ${py(0)} L ${px(0)} ${py(0)} Z`} fill="url(#hg)"/>
        <path d={aPath+` L ${px(pts[pts.length-1].min)} ${py(0)} L ${px(0)} ${py(0)} Z`} fill="url(#ag)"/>
        <path d={aPath} fill="none" stroke={awayColor} strokeWidth="2" strokeLinejoin="round"/>
        <path d={hPath} fill="none" stroke={homeColor} strokeWidth="2.5" strokeLinejoin="round"/>
        {events.filter(e=>e.type==="goal").map((e,i)=>(
          <g key={i}>
            <circle cx={px(e.min)} cy={py(e.hScore)} r="3" fill={e.team==="home"?homeColor:T.card} stroke={homeColor} strokeWidth="1.5"/>
            <circle cx={px(e.min)} cy={py(e.aScore)} r="3" fill={e.team==="away"?awayColor:T.card} stroke={awayColor} strokeWidth="1.5"/>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  EVENT CARD (timeline item)
// ═══════════════════════════════════════════════════
function EventCard({ev,homeColor,awayColor,homeName,awayName}) {
  const [expanded,setExpanded]=useState(false);
  const meta=EV_TYPES[ev.type]||EV_TYPES.goal;
  const isHome=ev.team==="home";
  const teamColor=isHome?homeColor:awayColor;
  const isHalf=ev.type==="half_time";
  const isShot=["goal","miss","saved"].includes(ev.type);
  const isDisc=DISC_TYPES.includes(ev.type);

  if(isHalf) return (
    <div style={{position:"relative",paddingLeft:28,marginBottom:14}}>
      <div style={{position:"absolute",left:7,width:20,height:20,borderRadius:"50%",
        background:"#8b5cf6",border:`2px solid ${T.card}`,
        display:"flex",alignItems:"center",justifyContent:"center",zIndex:2,fontSize:10}}>🔔</div>
      <div style={{background:"#140e2a",border:"1px solid #8b5cf644",borderRadius:10,
        padding:"9px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:12,fontWeight:700,color:"#8b5cf6"}}>🔔 DESCANSO</span>
        <span style={{fontSize:11,color:T.muted}}>30' · {ev.hScore}–{ev.aScore}</span>
      </div>
    </div>
  );

  return (
    <div style={{position:"relative",paddingLeft:28,marginBottom:10}}>
      <div style={{position:"absolute",left:7,width:20,height:20,borderRadius:"50%",
        background:meta.color+"25",border:`2px solid ${meta.color}`,
        display:"flex",alignItems:"center",justifyContent:"center",zIndex:2,fontSize:10}}>
        {meta.icon}
      </div>
      <div style={{background:T.card,borderRadius:11,border:`1px solid ${meta.color}1a`,
        borderLeft:`3px solid ${teamColor}`,overflow:"hidden",cursor:isShot?"pointer":"default"}}
        onClick={()=>isShot&&setExpanded(!expanded)}>
        {/* Main row */}
        <div style={{padding:"10px 12px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
            <div style={{flex:1}}>
              {/* Team + type */}
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:teamColor,flexShrink:0}}/>
                <span style={{fontSize:10,fontWeight:700,color:teamColor}}>{isHome?homeName:awayName}</span>
                <span style={{background:meta.color+"20",color:meta.color,borderRadius:8,
                  padding:"1px 7px",fontSize:9,fontWeight:700}}>{meta.icon} {meta.label}</span>
              </div>

              {/* Shot info */}
              {isShot&&(
                <div style={{display:"flex",flexWrap:"wrap",gap:6,alignItems:"center"}}>
                  {ev.shooter&&(
                    <span style={{fontSize:12,fontWeight:800,color:T.text}}>
                      #{ev.shooter.number} {ev.shooter.name}
                    </span>
                  )}
                  {ev.zone&&(
                    <span style={{background:ZONES[ev.zone]?.color+"18",color:ZONES[ev.zone]?.color,
                      border:`1px solid ${ZONES[ev.zone]?.color}33`,borderRadius:8,
                      padding:"1px 7px",fontSize:10,fontWeight:600}}>
                      {ZONES[ev.zone]?.emoji} {ZONES[ev.zone]?.label}
                    </span>
                  )}
                  {ev.quadrant!=null&&(
                    <span style={{background:"rgba(255,255,255,.06)",color:T.muted,
                      borderRadius:8,padding:"1px 7px",fontSize:10}}>
                      → {QUADRANTS[ev.quadrant]?.icon} {QUADRANTS[ev.quadrant]?.label}
                    </span>
                  )}
                </div>
              )}

              {/* Disciplinary */}
              {isDisc&&ev.sanctioned&&(
                <span style={{fontSize:12,fontWeight:800,color:T.text}}>
                  #{ev.sanctioned.number} {ev.sanctioned.name}
                </span>
              )}
              {ev.type==="timeout"&&<span style={{fontSize:12,color:T.muted}}>Tiempo muerto</span>}
            </div>

            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:12,fontWeight:700,color:T.muted}}>{ev.min}'</div>
              {ev.type==="goal"&&(
                <div style={{fontSize:14,fontWeight:900,color:T.green,lineHeight:1.2}}>
                  {ev.hScore}–{ev.aScore}
                </div>
              )}
              {isShot&&<div style={{fontSize:9,color:T.muted,marginTop:2}}>▾ detalle</div>}
            </div>
          </div>
        </div>

        {/* Expanded detail */}
        {expanded&&isShot&&(
          <div style={{borderTop:`1px solid ${T.border}`,padding:"12px 14px",
            background:T.card2,display:"flex",gap:10,flexWrap:"wrap"}}>
            {ev.goalkeeper&&(
              <div style={{flex:1,minWidth:120}}>
                <div style={{fontSize:9,color:T.muted,letterSpacing:1,marginBottom:5}}>ARQUERO</div>
                <div style={{display:"flex",alignItems:"center",gap:8,background:T.card,
                  borderRadius:9,padding:"8px 10px",border:`1px solid ${T.border}`}}>
                  <span style={{fontSize:18}}>🧤</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:T.text}}>{ev.goalkeeper.name}</div>
                    <div style={{fontSize:9,color:T.muted}}>#{ev.goalkeeper.number} · Arquero</div>
                  </div>
                </div>
              </div>
            )}
            {ev.zone&&(
              <div style={{flex:1,minWidth:120}}>
                <div style={{fontSize:9,color:T.muted,letterSpacing:1,marginBottom:5}}>ZONA DE LANZAMIENTO</div>
                <div style={{background:T.card,borderRadius:9,padding:"8px 10px",
                  border:`1px solid ${ZONES[ev.zone]?.color}33`}}>
                  <div style={{fontSize:12,fontWeight:700,color:ZONES[ev.zone]?.color}}>
                    {ZONES[ev.zone]?.emoji} {ZONES[ev.zone]?.label}
                  </div>
                </div>
              </div>
            )}
            {ev.quadrant!=null&&(
              <div style={{flex:1,minWidth:120}}>
                <div style={{fontSize:9,color:T.muted,letterSpacing:1,marginBottom:5}}>DESTINO DEL TIRO</div>
                <div style={{background:T.card,borderRadius:9,padding:"8px 10px",border:`1px solid ${T.border}`}}>
                  <div style={{fontSize:14,marginBottom:2}}>{QUADRANTS[ev.quadrant]?.icon}</div>
                  <div style={{fontSize:11,color:T.text,fontWeight:600}}>{QUADRANTS[ev.quadrant]?.label}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  REGISTER PAGE — MAIN FEATURE
// ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
//  MODALES COMPARTIDOS (usados en ambos modos)
// ═══════════════════════════════════════════════════
function ShotModal({form,upd,onClose,onSubmit,homeTeam,awayTeam,title}) {
  const currentTeam=form.team==="home"?homeTeam:awayTeam;
  const opponentTeam=form.team==="home"?awayTeam:homeTeam;
  const resultColor=form.type==="goal"?T.green:form.type==="saved"?"#60a5fa":T.red;
  const canSubmit=form.zone&&form.quadrant!=null&&form.shooter;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",backdropFilter:"blur(6px)",
      display:"flex",flexDirection:"column",justifyContent:"flex-end",zIndex:200}}>
      <div style={{background:T.card,borderRadius:"22px 22px 0 0",maxHeight:"92vh",overflowY:"auto",
        border:`1px solid ${T.border}`,animation:"slideUp .28s cubic-bezier(.34,1.2,.64,1)"}}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        <div style={{position:"sticky",top:0,background:T.card,padding:"14px 18px 10px",
          borderBottom:`1px solid ${T.border}`,zIndex:10}}>
          <div style={{width:40,height:4,background:T.border,borderRadius:2,margin:"0 auto 12px"}}/>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:15,fontWeight:800,color:T.text}}>{title||"🎯 Registrar Tiro"}</div>
              {form.zone&&<div style={{fontSize:11,color:ZONES[form.zone]?.color,marginTop:2}}>{ZONES[form.zone]?.emoji} {ZONES[form.zone]?.label}</div>}
            </div>
            <button onClick={onClose} style={{background:T.card2,border:`1px solid ${T.border}`,color:T.muted,borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12}}>✕</button>
          </div>
        </div>
        <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:16}}>
          <div><SectionLabel>RESULTADO</SectionLabel>
            <div style={{display:"flex",gap:7}}>
              {[{k:"goal",l:"⚽ GOL",c:T.green},{k:"saved",l:"🧤 ATAJADO",c:"#60a5fa"},{k:"miss",l:"❌ ERRADO",c:T.red}].map(r=>(
                <button key={r.k} onClick={()=>upd("type",r.k)}
                  style={{flex:1,background:form.type===r.k?r.c+"22":T.card2,color:form.type===r.k?r.c:T.muted,
                    border:`1.5px solid ${form.type===r.k?r.c:T.border}`,borderRadius:11,padding:"12px 4px",fontWeight:700,fontSize:12,cursor:"pointer"}}>{r.l}</button>
              ))}
            </div>
          </div>
          <div><SectionLabel>EQUIPO QUE LANZÓ</SectionLabel>
            <div style={{display:"flex",gap:7}}>
              {[{k:"home",t:homeTeam},{k:"away",t:awayTeam}].map(({k,t})=>(
                <button key={k} onClick={()=>upd("team",k)}
                  style={{flex:1,background:form.team===k?t.color+"22":T.card2,color:form.team===k?t.color:T.muted,
                    border:`1.5px solid ${form.team===k?t.color:T.border}`,borderRadius:11,padding:"12px",fontWeight:700,fontSize:13,cursor:"pointer"}}>{t.name}</button>
              ))}
            </div>
          </div>
          <div><SectionLabel>MINUTO</SectionLabel>
            <input type="number" value={form.minute} onChange={e=>upd("minute",e.target.value)} min="1" max="60"
              style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px 16px",color:T.text,fontSize:16,fontWeight:800,width:"100%"}}/>
          </div>
          <div><SectionLabel>ZONA DE LANZAMIENTO</SectionLabel>
            <MiniCourt onZoneClick={(z)=>upd("zone",z)} selZone={form.zone} heatCounts={{}}/>
          </div>
          <QuadrantPicker value={form.quadrant} onChange={(q)=>upd("quadrant",q)} resultColor={resultColor}/>
          <PlayerPicker players={currentTeam.players.filter(p=>p.pos!=="Arquero")} value={form.shooter}
            onChange={v=>upd("shooter",v)} label="JUGADOR QUE LANZÓ" accent={currentTeam.color}/>
          <PlayerPicker players={opponentTeam.players} value={form.goalkeeper}
            onChange={v=>upd("goalkeeper",v)} label={`ARQUERO RIVAL (${opponentTeam.name})`} accent="#60a5fa"/>
          <div style={{display:"flex",gap:9,paddingBottom:8}}>
            <button onClick={onClose} style={{flex:1,background:T.card2,color:T.muted,border:`1px solid ${T.border}`,borderRadius:13,padding:"13px",fontWeight:600,fontSize:14,cursor:"pointer"}}>Cancelar</button>
            <button onClick={onSubmit} disabled={!canSubmit}
              style={{flex:2,background:!canSubmit?"#1a2d4a":T.accent,color:!canSubmit?T.muted:"#fff",
                border:"none",borderRadius:13,padding:"13px",fontWeight:700,fontSize:14,cursor:!canSubmit?"not-allowed":"pointer"}}>
              ✓ Confirmar tiro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiscModal({form,upd,onClose,onSubmit,homeTeam,awayTeam}) {
  const currentTeam=form.team==="home"?homeTeam:awayTeam;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",backdropFilter:"blur(6px)",
      display:"flex",flexDirection:"column",justifyContent:"flex-end",zIndex:200}}>
      <div style={{background:T.card,borderRadius:"22px 22px 0 0",maxHeight:"88vh",overflowY:"auto",
        border:`1px solid ${T.border}`,animation:"slideUp .28s cubic-bezier(.34,1.2,.64,1)"}}>
        <div style={{position:"sticky",top:0,background:T.card,padding:"14px 18px 10px",borderBottom:`1px solid ${T.border}`,zIndex:10}}>
          <div style={{width:40,height:4,background:T.border,borderRadius:2,margin:"0 auto 12px"}}/>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontSize:15,fontWeight:800,color:T.text}}>{EV_TYPES[form.type]?.icon} {EV_TYPES[form.type]?.label}</div>
            <button onClick={onClose} style={{background:T.card2,border:`1px solid ${T.border}`,color:T.muted,borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12}}>✕</button>
          </div>
        </div>
        <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:14}}>
          {["exclusion","red_card","blue_card","yellow_card"].includes(form.type)&&(
            <div><SectionLabel>TIPO DE SANCIÓN</SectionLabel>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                {[{k:"exclusion",l:"⏱ Exclusión 2'",c:T.orange},{k:"yellow_card",l:"🟨 Amarilla",c:T.yellow},{k:"red_card",l:"🟥 Roja",c:T.red},{k:"blue_card",l:"🟦 Azul",c:T.accent}].map(s=>(
                  <button key={s.k} onClick={()=>upd("type",s.k)}
                    style={{background:form.type===s.k?s.c+"22":T.card2,color:form.type===s.k?s.c:T.muted,
                      border:`1.5px solid ${form.type===s.k?s.c:T.border}`,borderRadius:11,padding:"11px 10px",fontWeight:700,fontSize:12,cursor:"pointer"}}>{s.l}</button>
                ))}
              </div>
            </div>
          )}
          <div><SectionLabel>EQUIPO</SectionLabel>
            <div style={{display:"flex",gap:7}}>
              {[{k:"home",t:homeTeam},{k:"away",t:awayTeam}].map(({k,t})=>(
                <button key={k} onClick={()=>upd("team",k)}
                  style={{flex:1,background:form.team===k?t.color+"22":T.card2,color:form.team===k?t.color:T.muted,
                    border:`1.5px solid ${form.team===k?t.color:T.border}`,borderRadius:11,padding:"12px",fontWeight:700,fontSize:13,cursor:"pointer"}}>{t.name}</button>
              ))}
            </div>
          </div>
          <div><SectionLabel>MINUTO</SectionLabel>
            <input type="number" value={form.minute} onChange={e=>upd("minute",e.target.value)} min="1" max="60"
              style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px 16px",color:T.text,fontSize:16,fontWeight:800,width:"100%"}}/>
          </div>
          {form.type!=="timeout"&&form.type!=="half_time"&&(
            <PlayerPicker players={currentTeam.players} value={form.sanctioned}
              onChange={v=>upd("sanctioned",v)} label="JUGADOR SANCIONADO" accent={EV_TYPES[form.type]?.color}/>
          )}
          <div style={{display:"flex",gap:9,paddingBottom:8}}>
            <button onClick={onClose} style={{flex:1,background:T.card2,color:T.muted,border:`1px solid ${T.border}`,borderRadius:13,padding:"13px",fontWeight:600,fontSize:14,cursor:"pointer"}}>Cancelar</button>
            <button onClick={onSubmit} style={{flex:2,background:EV_TYPES[form.type]?.color||T.accent,color:"#fff",border:"none",borderRadius:13,padding:"13px",fontWeight:700,fontSize:14,cursor:"pointer"}}>
              ✓ Confirmar {EV_TYPES[form.type]?.label}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  REGISTER PAGE — MODO RÁPIDO + COMPLETO
// ═══════════════════════════════════════════════════
function RegisterPage({events,setEvents,matchStatus,setMatchStatus,matchInfo,onCloseMatch,onStartMatch,persistEvent,updatePersistedEvent}) {
  const homeTeam=INIT_TEAMS[0];
  const awayTeam=INIT_TEAMS[1];

  // ── shared state ──
  const [regMode,setRegMode]=useState("quick"); // "quick" | "full"
  const [minute,setMinute]=useState(1);
  const [step,setStep]=useState(null);
  const [completingId,setCompletingId]=useState(null);
  const [form,setForm]=useState({type:"goal",team:"home",zone:null,quadrant:null,shooter:null,goalkeeper:null,sanctioned:null,minute:"1"});
  // lado de ataque: "left"=ataca hacia arco izquierdo, "right"=ataca hacia arco derecho
  const [homeSide,setHomeSide]=useState("right");
  const awaySide=homeSide==="right"?"left":"right";
  const upd=(k,v)=>setForm(f=>({...f,[k]:v}));
  // lForm: estado de FullMode subido aquí para no violar reglas de hooks
  const [lForm,setLForm]=useState({type:"goal",team:"home",zone:null,quadrant:null,shooter:null,goalkeeper:null,sanctioned:null,minute:"1",distance:null,situation:"igualdad",throwType:null});
  const lupd=(k,v)=>setLForm(f=>({...f,[k]:v}));
  // Quick mode extras
  const [quickZone,setQuickZone]=useState(null);        // zona seleccionada en modo rápido
  const [quickSit,setQuickSit]=useState("igualdad");    // situación en modo rápido

  // derived
  const heatCounts=useMemo(()=>{const c={};events.filter(e=>e.zone).forEach(e=>{c[e.zone]=(c[e.zone]||0)+1;});return c;},[events]);
  const lastScore=events.filter(e=>e.hScore!=null).slice(-1)[0]||{hScore:0,aScore:0};
  const totals={goals:events.filter(e=>e.type==="goal").length,saved:events.filter(e=>e.type==="saved").length,miss:events.filter(e=>e.type==="miss").length,excl:events.filter(e=>e.type==="exclusion").length,tm:events.filter(e=>e.type==="timeout").length};
  const pendingCount=events.filter(e=>!e.completed&&["goal","miss","saved"].includes(e.type)).length;

  // ── helpers ──
  const calcScore=(type,team)=>{
    const prev=events.filter(e=>e.hScore!=null).slice(-1)[0]||{hScore:0,aScore:0};
    let {hScore,aScore}=prev;
    if(type==="goal"){team==="home"?hScore++:aScore++;}
    return {hScore,aScore};
  };

  // ── QUICK TAP ──
  const quickTap=(type,team)=>{
    const score=calcScore(type,team);
    const side=team==="home"?homeSide:awaySide;
    const localId=Date.now();
    const ev={
      id:localId, min:minute, team, type,
      attackSide:side, zone:quickZone, quadrant:null,
      situation:quickSit,
      shooter:null, goalkeeper:null, sanctioned:null,
      completed:false, quickMode:true, ...score,
    };
    setEvents(prev=>[...prev,ev]);
    if(persistEvent){
      persistEvent(ev).then(uuid=>{
        if(uuid&&uuid!==localId){
          setEvents(prev=>prev.map(e=>e.id===localId?{...e,id:uuid}:e));
        }
      }).catch(()=>{});
    }
  };

  const quickDisc=(type)=>{
    upd("type",type);upd("minute",String(minute));
    setStep("disc_quick");
  };

  // ── FULL SUBMIT ──
  const submitFull=()=>{
    const min=parseInt(form.minute)||1;
    const score=calcScore(form.type,form.team);
    const currentTeam=form.team==="home"?homeTeam:awayTeam;
    const opponentTeam=form.team==="home"?awayTeam:homeTeam;
    const fp=currentTeam.players.filter(p=>p.pos!=="Arquero");
    const shooter=form.shooter?{name:form.shooter,number:fp.find(p=>p.name===form.shooter)?.number}:null;
    const goalkeeper=form.goalkeeper?{name:form.goalkeeper,number:opponentTeam.players.find(p=>p.name===form.goalkeeper)?.number}:null;

    if(completingId){
      // completar evento rápido existente
      const upd={zone:form.zone,quadrant:form.quadrant,min,type:form.type,shooter,goalkeeper,completed:true};
      setEvents(prev=>prev.map(e=>e.id===completingId?{...e,...upd}:e));
      if(updatePersistedEvent) updatePersistedEvent(completingId,upd).catch(()=>{});
      setCompletingId(null);
    } else {
      const localId=Date.now();
      const ev={id:localId,min,team:form.team,type:form.type,zone:form.zone,quadrant:form.quadrant,shooter,goalkeeper,sanctioned:null,completed:true,...score};
      setEvents(prev=>[...prev,ev]);
      if(persistEvent){
        persistEvent(ev).then(uuid=>{
          if(uuid&&uuid!==localId) setEvents(prev=>prev.map(e=>e.id===localId?{...e,id:uuid}:e));
        }).catch(()=>{});
      }
    }
    setStep(null);
    setForm({type:"goal",team:"home",zone:null,quadrant:null,shooter:null,goalkeeper:null,sanctioned:null,minute:"1"});
  };

  const submitDisc=()=>{
    const min=parseInt(form.minute)||1;
    const prev=events.filter(e=>e.hScore!=null).slice(-1)[0]||{hScore:0,aScore:0};
    const currentTeam=form.team==="home"?homeTeam:awayTeam;
    const sanctioned=form.sanctioned?{name:form.sanctioned,number:currentTeam.players.find(p=>p.name===form.sanctioned)?.number}:null;
    const localId=Date.now();
    const ev={id:localId,min,team:form.team,type:form.type,completed:true,sanctioned,hScore:prev.hScore,aScore:prev.aScore};
    setEvents(p=>[...p,ev]);
    if(persistEvent){
      persistEvent(ev).then(uuid=>{
        if(uuid&&uuid!==localId) setEvents(prev=>prev.map(e=>e.id===localId?{...e,id:uuid}:e));
      }).catch(()=>{});
    }
    setStep(null);
    setForm(f=>({...f,sanctioned:null,minute:"1"}));
  };

  const openComplete=(ev)=>{
    setCompletingId(ev.id);
    setForm({type:ev.type,team:ev.team,zone:null,quadrant:null,shooter:null,goalkeeper:null,sanctioned:null,minute:String(ev.min)});
    setStep("shot_detail");
  };

  // ── SCOREBOARD ──
  const Scoreboard=()=>(
    <div style={{background:`linear-gradient(135deg,${homeTeam.color}18,${awayTeam.color}18)`,
      borderRadius:14,padding:"12px 16px",border:`1px solid ${T.border}`,marginBottom:12,
      display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{textAlign:"center",flex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:5,justifyContent:"center",marginBottom:2}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:homeTeam.color}}/>
          <span style={{fontSize:12,fontWeight:700,color:T.text}}>{homeTeam.name}</span>
        </div>
        <div style={{fontSize:38,fontWeight:900,color:homeTeam.color,lineHeight:1}}>{lastScore.hScore}</div>
      </div>
      <div style={{textAlign:"center",padding:"0 10px"}}>
        <div style={{fontSize:9,color:T.muted,letterSpacing:1,marginBottom:2}}>EN VIVO</div>
        <div style={{width:7,height:7,borderRadius:"50%",background:T.red,margin:"0 auto",animation:"blkR 1.2s infinite"}}/>
        <style>{`@keyframes blkR{0%,100%{opacity:1}50%{opacity:.2}}`}</style>
      </div>
      <div style={{textAlign:"center",flex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:5,justifyContent:"center",marginBottom:2}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:awayTeam.color}}/>
          <span style={{fontSize:12,fontWeight:700,color:T.text}}>{awayTeam.name}</span>
        </div>
        <div style={{fontSize:38,fontWeight:900,color:awayTeam.color,lineHeight:1}}>{lastScore.aScore}</div>
      </div>
    </div>
  );

  // ── KPI bar ──
  const KPIBar=()=>(
    <div style={{display:"flex",gap:5,marginBottom:12}}>
      {[{l:"Goles",v:totals.goals,c:T.green},{l:"Ataj.",v:totals.saved,c:"#60a5fa"},{l:"Err.",v:totals.miss,c:T.red},{l:"Excl.",v:totals.excl,c:T.orange},{l:"T.M.",v:totals.tm,c:T.yellow}].map(k=>(
        <div key={k.l} style={{flex:1,background:T.card,borderRadius:9,padding:"7px 4px",border:`1px solid ${T.border}`,textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:800,color:k.c,lineHeight:1}}>{k.v}</div>
          <div style={{fontSize:9,color:T.muted,marginTop:2}}>{k.l}</div>
        </div>
      ))}
    </div>
  );

  // ── QUICK MODE ──
  const QuickMode=()=>{
    // Per-team stat counts from events
    const teamStats=(team)=>({
      tiros: events.filter(e=>["goal","miss","saved"].includes(e.type)&&e.team===team).length,
      goals: events.filter(e=>e.type==="goal"&&e.team===team).length,
      saved: events.filter(e=>e.type==="saved"&&e.team===team).length,
      miss:  events.filter(e=>e.type==="miss"&&e.team===team).length,
      excl:  events.filter(e=>e.type==="exclusion"&&e.team===team).length,
      turn:  events.filter(e=>e.type==="turnover"&&e.team===team).length,
    });
    const hs=teamStats("home"), as=teamStats("away");

    const pressBtn=(e)=>{e.currentTarget.style.transform="scale(.93)";};
    const releaseBtn=(e)=>{e.currentTarget.style.transform="scale(1)";};

    const TeamBlock=({team,teamData,stats})=>{
      const c=teamData.color;
      const side=team==="home"?homeSide:awaySide;
      const statItems=[
        {l:"Tiros", v:stats.tiros, c:T.text},
        {l:"Goles", v:stats.goals, c:T.green},
        {l:"Ataj.",  v:stats.saved, c:"#60a5fa"},
        {l:"Errad.", v:stats.miss,  c:T.red},
        {l:"Excl.",  v:stats.excl,  c:T.orange},
        {l:"Pérd.",  v:stats.turn,  c:T.muted},
      ];
      const shotBtns=[
        {k:"goal", icon:"⚽", lbl:"GOL",      c:T.green},
        {k:"saved",icon:"🧤", lbl:"ATAJADA",  c:"#60a5fa"},
        {k:"miss", icon:"❌", lbl:"FUERA",    c:T.red},
        {k:"turnover", icon:"🔄", lbl:"PÉRDIDA", c:T.muted},
      ];
      return (
        <div style={{background:c+"0c",borderRadius:16,border:`1px solid ${c}30`,padding:"12px 12px 14px",marginBottom:10}}>
          {/* Team name + side selector */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:c,flexShrink:0}}/>
              <span style={{fontSize:14,fontWeight:800,color:c,letterSpacing:.5}}>{teamData.name}</span>
            </div>
            {/* Side selector — solo editable para home, away se invierte automático */}
            {team==="home"?(
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontSize:9,color:T.muted}}>Ataca →</span>
                <div style={{display:"flex",background:T.card2,borderRadius:8,border:`1px solid ${T.border}`,overflow:"hidden"}}>
                  {[{v:"left",l:"◀ Izq"},{v:"right",l:"Der ▶"}].map(opt=>(
                    <button key={opt.v} onClick={()=>setHomeSide(opt.v)}
                      style={{padding:"4px 9px",fontSize:9,fontWeight:700,cursor:"pointer",border:"none",
                        background:homeSide===opt.v?c+"44":"transparent",
                        color:homeSide===opt.v?c:T.muted,transition:"all .15s"}}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
            ):(
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontSize:9,color:T.muted}}>Ataca →</span>
                <span style={{fontSize:9,fontWeight:700,color:c,background:c+"22",borderRadius:7,padding:"4px 9px",border:`1px solid ${c}44`}}>
                  {awaySide==="left"?"◀ Izq":"Der ▶"}
                </span>
              </div>
            )}
          </div>

          {/* Mini court direction indicator */}
          <div style={{marginBottom:10,background:"rgba(0,0,0,.2)",borderRadius:8,padding:"5px 8px",display:"flex",alignItems:"center",gap:6}}>
            <svg width="80" height="20" viewBox="0 0 80 20">
              <rect x="1" y="4" width="78" height="12" rx="2" fill="#1565a0" stroke="#2196c4" strokeWidth="1"/>
              <line x1="40" y1="4" x2="40" y2="16" stroke="rgba(255,255,255,.3)" strokeWidth="1"/>
              {side==="right"?(
                <>
                  <rect x="62" y="6" width="4" height="8" rx="1" fill={c} opacity=".8"/>
                  <line x1="62" y1="10" x2="74" y2="10" stroke={c} strokeWidth="2"/>
                  <polygon points="74,7 80,10 74,13" fill={c}/>
                  <circle cx="20" cy="10" r="4" fill={c} opacity=".6"/>
                </>
              ):(
                <>
                  <rect x="14" y="6" width="4" height="8" rx="1" fill={c} opacity=".8"/>
                  <line x1="18" y1="10" x2="6" y2="10" stroke={c} strokeWidth="2"/>
                  <polygon points="6,7 0,10 6,13" fill={c}/>
                  <circle cx="60" cy="10" r="4" fill={c} opacity=".6"/>
                </>
              )}
            </svg>
            <span style={{fontSize:9,color:T.muted}}>
              {side==="right"
                ? `${teamData.name} ataca hacia arco derecho`
                : `${teamData.name} ataca hacia arco izquierdo`}
            </span>
          </div>

          {/* Stats row */}
          <div style={{display:"flex",gap:4,marginBottom:12}}>
            {statItems.map(s=>(
              <div key={s.l} style={{flex:1,textAlign:"center",background:"rgba(0,0,0,.25)",borderRadius:8,padding:"5px 2px",border:`1px solid rgba(255,255,255,.04)`}}>
                <div style={{fontSize:15,fontWeight:800,color:s.c,lineHeight:1}}>{s.v}</div>
                <div style={{fontSize:8,color:T.muted,marginTop:2,letterSpacing:.3}}>{s.l}</div>
              </div>
            ))}
          </div>
          {/* Zona de lanzamiento — mini pills */}
          <div style={{marginBottom:8}}>
            <div style={{fontSize:8,color:T.muted,letterSpacing:1,marginBottom:4}}>ZONA (opcional)</div>
            <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
              {Object.entries(ZONES).map(([k,z])=>(
                <button key={k} onClick={()=>setQuickZone(quickZone===k?null:k)}
                  style={{background:quickZone===k?z.color+"33":"rgba(0,0,0,.2)",
                    border:`1px solid ${quickZone===k?z.color:"rgba(255,255,255,.08)"}`,
                    borderRadius:7,padding:"4px 7px",fontSize:9,fontWeight:700,
                    color:quickZone===k?z.color:T.muted,cursor:"pointer",transition:"all .12s"}}>
                  {z.short}
                </button>
              ))}
              {quickZone&&<button onClick={()=>setQuickZone(null)}
                style={{background:"transparent",border:"none",fontSize:9,color:T.muted,cursor:"pointer"}}>✕</button>}
            </div>
          </div>
          {/* Shot buttons */}
          <div style={{display:"flex",gap:6}}>
            {shotBtns.map((b,i)=>(
              <button key={i} onClick={()=>quickTap(b.k,team)}
                onTouchStart={pressBtn} onTouchEnd={releaseBtn}
                onMouseDown={pressBtn} onMouseUp={releaseBtn}
                style={{
                  flex: b.k==="goal"?1.25:1,
                  background: b.k==="goal"?b.c+"28":b.c+"12",
                  border:`${b.k==="goal"?"2px":"1px"} solid ${b.c}${b.k==="goal"?"55":"28"}`,
                  borderRadius:12,
                  padding: b.k==="goal"?"14px 6px":"12px 4px",
                  cursor:"pointer",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:3,
                  transition:"transform .1s",
                  WebkitTapHighlightColor:"transparent",
                }}>
                <span style={{fontSize:b.k==="goal"?26:20,lineHeight:1}}>{b.icon}</span>
                <span style={{fontSize:b.k==="goal"?10:8,fontWeight:800,color:b.c,letterSpacing:.5}}>{b.lbl}</span>
              </button>
            ))}
          </div>
        </div>
      );
    };

    return (
      <div>
        {/* Situación de juego — compartida */}
        <div style={{background:T.card,borderRadius:12,padding:"8px 12px",marginBottom:10,border:`1px solid ${T.border}`}}>
          <div style={{fontSize:8,color:T.muted,letterSpacing:1,marginBottom:6}}>SITUACIÓN</div>
          <div style={{display:"flex",gap:5}}>
            {SITUATIONS.map(s=>(
              <button key={s.k} onClick={()=>setQuickSit(s.k)}
                style={{flex:1,background:quickSit===s.k?s.color+"22":"transparent",
                  border:`1px solid ${quickSit===s.k?s.color:T.border}`,
                  borderRadius:9,padding:"6px 4px",fontSize:9,fontWeight:700,
                  color:quickSit===s.k?s.color:T.muted,cursor:"pointer",transition:"all .12s",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                <span style={{fontSize:14}}>{s.emoji}</span>
                <span>{s.l}</span>
              </button>
            ))}
          </div>
        </div>
        {/* Team blocks */}
        <TeamBlock team="home" teamData={homeTeam} stats={hs}/>
        <TeamBlock team="away" teamData={awayTeam} stats={as}/>

        {/* Shared discipline buttons */}
        <div style={{marginBottom:12}}>
          <SectionLabel>EVENTOS GENERALES</SectionLabel>
          <div style={{display:"flex",gap:6}}>
            {[
              {k:"exclusion", l:"⏱ Excl. 2'", c:T.orange},
              {k:"timeout",   l:"⏸ T. Muerto",c:T.yellow},
              {k:"red_card",  l:"🟥 Roja",    c:T.red},
              {k:"half_time", l:"🔔 Descanso", c:T.purple},
            ].map(b=>(
              <button key={b.k} onClick={()=>quickDisc(b.k)}
                style={{flex:1,background:T.card,border:`1px solid ${T.border}`,borderRadius:11,
                  padding:"10px 4px",color:b.c,fontWeight:700,fontSize:10,cursor:"pointer",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:3,textAlign:"center"}}>
                <span style={{fontSize:14}}>{b.l.split(" ")[0]}</span>
                <span style={{fontSize:8,color:b.c,fontWeight:700,letterSpacing:.3}}>{b.l.split(" ").slice(1).join(" ")}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Pending to complete */}
        {pendingCount>0&&(
          <div style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.3)",borderRadius:12,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:T.yellow}}>📋 Completar datos</div>
              <div style={{fontSize:11,color:T.muted,marginTop:2}}>{pendingCount} evento{pendingCount!==1?"s":""} sin detallar</div>
            </div>
            <button onClick={()=>setRegMode("pending")}
              style={{background:T.yellow+"22",border:`1px solid ${T.yellow}44`,color:T.yellow,borderRadius:9,padding:"8px 12px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
              Ver →
            </button>
          </div>
        )}

        {/* Recent events */}
        {events.length>0&&(
          <div>
            <SectionLabel>ÚLTIMOS EVENTOS</SectionLabel>
            <div style={{position:"relative",paddingLeft:14}}>
              <div style={{position:"absolute",left:14,top:0,bottom:0,width:2,background:T.border,borderRadius:1}}/>
              {[...events].reverse().slice(0,5).map(ev=>(
                <div key={ev.id} style={{position:"relative",paddingLeft:28,marginBottom:8}}>
                  <div style={{position:"absolute",left:7,width:18,height:18,borderRadius:"50%",
                    background:EV_TYPES[ev.type]?.color+"25",border:`2px solid ${EV_TYPES[ev.type]?.color}`,
                    display:"flex",alignItems:"center",justifyContent:"center",zIndex:2,fontSize:9}}>
                    {EV_TYPES[ev.type]?.icon}
                  </div>
                  <div style={{background:T.card,borderRadius:10,border:`1px solid ${T.border}`,
                    borderLeft:`3px solid ${ev.team==="home"?homeTeam.color:awayTeam.color}`,padding:"8px 11px",
                    display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:1}}>
                        <span style={{fontSize:10,fontWeight:700,color:ev.team==="home"?homeTeam.color:awayTeam.color}}>
                          {ev.team==="home"?homeTeam.name:awayTeam.name}
                        </span>
                        <span style={{background:EV_TYPES[ev.type]?.color+"20",color:EV_TYPES[ev.type]?.color,
                          borderRadius:8,padding:"1px 6px",fontSize:9,fontWeight:700}}>
                          {EV_TYPES[ev.type]?.label}
                        </span>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      {ev.type==="goal"&&<span style={{fontSize:12,fontWeight:900,color:T.green}}>{ev.hScore}–{ev.aScore}</span>}
                      {["goal","miss","saved"].includes(ev.type)&&!ev.completed&&(
                        <button onClick={()=>openComplete(ev)}
                          style={{background:"rgba(245,158,11,.15)",border:"1px solid rgba(245,158,11,.4)",
                            color:T.yellow,borderRadius:8,padding:"4px 8px",fontSize:10,fontWeight:700,cursor:"pointer"}}>
                          + datos
                        </button>
                      )}
                      {ev.completed&&<span style={{fontSize:14}}>✅</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── PENDING MODE (completar datos) ──
  const PendingMode=()=>{
    const pending=events.filter(e=>!e.completed&&["goal","miss","saved"].includes(e.type));
    const done=events.filter(e=>e.completed&&["goal","miss","saved"].includes(e.type));
    return (
      <div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
          <button onClick={()=>setRegMode("quick")} style={{background:"transparent",border:"none",color:T.muted,fontSize:13,cursor:"pointer",padding:0}}>← Volver</button>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:800,color:T.text}}>📋 Completar datos</div>
            <div style={{fontSize:11,color:T.muted}}>{pending.length} pendientes · {done.length} completos</div>
          </div>
        </div>

        {pending.length===0&&(
          <div style={{textAlign:"center",padding:"30px 0",color:T.green}}>
            <div style={{fontSize:40,marginBottom:10}}>✅</div>
            <div style={{fontSize:14,fontWeight:700,color:T.text}}>¡Todo completado!</div>
            <div style={{fontSize:12,color:T.muted,marginTop:4}}>Todos los tiros tienen sus datos detallados.</div>
          </div>
        )}

        {pending.length>0&&(
          <div style={{marginBottom:18}}>
            <SectionLabel>SIN COMPLETAR ({pending.length})</SectionLabel>
            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              {pending.map(ev=>{
                const tc=ev.team==="home"?homeTeam.color:awayTeam.color;
                const tn=ev.team==="home"?homeTeam.name:awayTeam.name;
                return (
                  <div key={ev.id} style={{background:T.card,borderRadius:12,border:`1px solid ${T.yellow}33`,
                    borderLeft:`4px solid ${T.yellow}`,padding:"12px 14px",
                    display:"flex",alignItems:"center",gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
                        <span style={{fontSize:18}}>{EV_TYPES[ev.type]?.icon}</span>
                        <span style={{fontSize:13,fontWeight:700,color:T.text}}>{EV_TYPES[ev.type]?.label}</span>
                        <span style={{fontSize:10,color:T.muted}}>{ev.min}'</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:tc}}/>
                        <span style={{fontSize:11,color:tc,fontWeight:600}}>{tn}</span>
                        {ev.type==="goal"&&<span style={{fontSize:11,color:T.green,fontWeight:700}}>→ {ev.hScore}–{ev.aScore}</span>}
                      </div>
                    </div>
                    <button onClick={()=>{setRegMode("quick");openComplete(ev);}}
                      style={{background:`linear-gradient(135deg,${T.accent},${T.cyan})`,border:"none",color:"#fff",
                        borderRadius:11,padding:"10px 16px",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                      Completar →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {done.length>0&&(
          <div>
            <SectionLabel>COMPLETADOS ({done.length})</SectionLabel>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {done.map(ev=>{
                const tc=ev.team==="home"?homeTeam.color:awayTeam.color;
                const tn=ev.team==="home"?homeTeam.name:awayTeam.name;
                return (
                  <div key={ev.id} style={{background:T.card,borderRadius:12,border:`1px solid ${T.green}22`,
                    borderLeft:`4px solid ${T.green}`,padding:"11px 14px",
                    display:"flex",alignItems:"center",gap:12,opacity:0.75}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                        <span style={{fontSize:16}}>{EV_TYPES[ev.type]?.icon}</span>
                        <span style={{fontSize:12,fontWeight:700,color:T.text}}>{EV_TYPES[ev.type]?.label}</span>
                        <span style={{fontSize:10,color:T.muted}}>{ev.min}'</span>
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5,alignItems:"center"}}>
                        <span style={{fontSize:10,color:tc,fontWeight:600}}>{tn}</span>
                        {ev.shooter&&<span style={{fontSize:10,color:T.muted}}>#{ev.shooter.number} {ev.shooter.name}</span>}
                        {ev.zone&&<span style={{background:ZONES[ev.zone]?.color+"18",color:ZONES[ev.zone]?.color,borderRadius:6,padding:"1px 6px",fontSize:9,fontWeight:600}}>{ZONES[ev.zone]?.emoji} {ZONES[ev.zone]?.short}</span>}
                      </div>
                    </div>
                    <span style={{fontSize:20}}>✅</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── FULL MODE (existing complete registration) ──
  const FullMode=()=>{
    const currentTeam=lForm.team==="home"?homeTeam:awayTeam;
    const opponentTeam=lForm.team==="home"?awayTeam:homeTeam;
    const hc=heatCounts;
    const lSubmit=()=>{
      const min=parseInt(lForm.minute)||1;
      const score=calcScore(lForm.type,lForm.team);
      const fp=currentTeam.players.filter(p=>p.pos!=="Arquero");
      const localId=Date.now();
      const ev={
        id:localId,min,team:lForm.team,type:lForm.type,
        zone:lForm.zone,quadrant:lForm.quadrant,completed:true,
        distance:lForm.distance||null,
        situation:lForm.situation||"igualdad",
        throwType:lForm.throwType||null,
        shooter:lForm.shooter?{name:lForm.shooter,number:fp.find(p=>p.name===lForm.shooter)?.number}:null,
        goalkeeper:lForm.goalkeeper?{name:lForm.goalkeeper,number:opponentTeam.players.find(p=>p.name===lForm.goalkeeper)?.number}:null,
        sanctioned:null,...score,
      };
      setEvents(prev=>[...prev,ev]);
      if(persistEvent){
        persistEvent(ev).then(uuid=>{
          if(uuid&&uuid!==localId) setEvents(prev=>prev.map(e=>e.id===localId?{...e,id:uuid}:e));
        }).catch(()=>{});
      }
      setLForm({type:"goal",team:"home",zone:null,quadrant:null,shooter:null,goalkeeper:null,sanctioned:null,minute:String(minute),distance:null,situation:"igualdad",throwType:null});
    };
    const lSubmitDisc=()=>{
      const min=parseInt(lForm.minute)||1;
      const prev=events.filter(e=>e.hScore!=null).slice(-1)[0]||{hScore:0,aScore:0};
      setEvents(prev=>[...prev,{
        id:Date.now(),min,team:lForm.team,type:lForm.type,completed:true,
        sanctioned:lForm.sanctioned?{name:lForm.sanctioned,number:currentTeam.players.find(p=>p.name===lForm.sanctioned)?.number}:null,
        hScore:prev.hScore,aScore:prev.aScore,
      }]);
      setLForm(f=>({...f,sanctioned:null}));
    };
    const isShot=["goal","miss","saved"].includes(lForm.type);
    const resultColor=lForm.type==="goal"?T.green:lForm.type==="saved"?"#60a5fa":T.red;
    const canSubmit=lForm.zone&&lForm.quadrant!=null&&lForm.shooter;
    return (
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <MiniCourt onZoneClick={(z)=>lupd("zone",z)} selZone={lForm.zone} heatCounts={hc}/>
        <div>
          <SectionLabel>TIPO DE EVENTO</SectionLabel>
          <div style={{display:"flex",gap:7}}>
            {[{k:"shot",l:"🎯 Tiro"},{k:"disc",l:"🃏 Evento"}].map(t=>{
              const isShotMode=["goal","miss","saved"].includes(lForm.type);
              const active=t.k==="shot"?isShotMode:!isShotMode;
              return <button key={t.k} onClick={()=>{if(t.k==="shot")lupd("type","goal");else lupd("type","exclusion");}}
                style={{flex:1,background:active?T.accent+"22":T.card2,color:active?T.accent:T.muted,
                  border:`1px solid ${active?T.accent:T.border}`,borderRadius:10,padding:"11px",fontWeight:700,fontSize:13,cursor:"pointer"}}>{t.l}</button>;
            })}
          </div>
        </div>
        {isShot?(
          <>
            <div><SectionLabel>RESULTADO</SectionLabel>
              <div style={{display:"flex",gap:7}}>
                {[{k:"goal",l:"⚽ GOL",c:T.green},{k:"saved",l:"🧤 ATAJADO",c:"#60a5fa"},{k:"miss",l:"❌ ERRADO",c:T.red}].map(r=>(
                  <button key={r.k} onClick={()=>lupd("type",r.k)}
                    style={{flex:1,background:lForm.type===r.k?r.c+"22":T.card2,color:lForm.type===r.k?r.c:T.muted,
                      border:`1.5px solid ${lForm.type===r.k?r.c:T.border}`,borderRadius:11,padding:"11px 4px",fontWeight:700,fontSize:12,cursor:"pointer"}}>{r.l}</button>
                ))}
              </div>
            </div>
            <div><SectionLabel>EQUIPO</SectionLabel>
              <div style={{display:"flex",gap:7}}>
                {[{k:"home",t:homeTeam},{k:"away",t:awayTeam}].map(({k,t})=>(
                  <button key={k} onClick={()=>lupd("team",k)}
                    style={{flex:1,background:lForm.team===k?t.color+"22":T.card2,color:lForm.team===k?t.color:T.muted,
                      border:`1.5px solid ${lForm.team===k?t.color:T.border}`,borderRadius:11,padding:"11px",fontWeight:700,fontSize:13,cursor:"pointer"}}>{t.name}</button>
                ))}
              </div>
            </div>
            <div><SectionLabel>MINUTO</SectionLabel>
              <input type="number" value={lForm.minute} onChange={e=>lupd("minute",e.target.value)} min="1" max="60"
                style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px 16px",color:T.text,fontSize:16,fontWeight:800,width:"100%"}}/>
            </div>
            <QuadrantPicker value={lForm.quadrant} onChange={(q)=>lupd("quadrant",q)} resultColor={resultColor}/>
            <PlayerPicker players={currentTeam.players.filter(p=>p.pos!=="Arquero")} value={lForm.shooter}
              onChange={v=>lupd("shooter",v)} label="JUGADOR QUE LANZÓ" accent={currentTeam.color}/>
            <PlayerPicker players={opponentTeam.players} value={lForm.goalkeeper}
              onChange={v=>lupd("goalkeeper",v)} label={`ARQUERO RIVAL (${opponentTeam.name})`} accent="#60a5fa"/>
            {/* ── ANÁLISIS AVANZADO ── */}
            <div style={{background:T.card2,borderRadius:12,padding:"12px",border:`1px solid ${T.border}`}}>
              <div style={{fontSize:10,color:T.accent,letterSpacing:2,marginBottom:10,fontWeight:700}}>ANÁLISIS AVANZADO</div>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:9,color:T.muted,letterSpacing:1,marginBottom:5}}>DISTANCIA</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {DISTANCES.map(d=>(
                    <button key={d.k} onClick={()=>lupd("distance",lForm.distance===d.k?null:d.k)}
                      style={{flex:1,minWidth:"17%",background:lForm.distance===d.k?T.accent+"22":"rgba(0,0,0,.2)",
                        border:`1px solid ${lForm.distance===d.k?T.accent:T.border}`,
                        borderRadius:8,padding:"6px 2px",fontSize:9,fontWeight:700,
                        color:lForm.distance===d.k?T.accent:T.muted,cursor:"pointer",
                        display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                      <span>{d.emoji}</span><span>{d.l}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:9,color:T.muted,letterSpacing:1,marginBottom:5}}>SITUACIÓN</div>
                <div style={{display:"flex",gap:5}}>
                  {SITUATIONS.map(s=>(
                    <button key={s.k} onClick={()=>lupd("situation",s.k)}
                      style={{flex:1,background:lForm.situation===s.k?s.color+"22":"rgba(0,0,0,.2)",
                        border:`1px solid ${lForm.situation===s.k?s.color:T.border}`,
                        borderRadius:8,padding:"7px 2px",fontSize:9,fontWeight:700,
                        color:lForm.situation===s.k?s.color:T.muted,cursor:"pointer",
                        display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                      <span style={{fontSize:13}}>{s.emoji}</span><span>{s.l}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{fontSize:9,color:T.muted,letterSpacing:1,marginBottom:5}}>TIPO DE LANZAMIENTO</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {THROW_TYPES.map(t=>(
                    <button key={t.k} onClick={()=>lupd("throwType",lForm.throwType===t.k?null:t.k)}
                      style={{flex:1,minWidth:"17%",background:lForm.throwType===t.k?T.yellow+"22":"rgba(0,0,0,.2)",
                        border:`1px solid ${lForm.throwType===t.k?T.yellow:T.border}`,
                        borderRadius:8,padding:"6px 2px",fontSize:9,fontWeight:700,
                        color:lForm.throwType===t.k?T.yellow:T.muted,cursor:"pointer",
                        display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                      <span>{t.emoji}</span><span>{t.l}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={lSubmit} disabled={!canSubmit}
              style={{background:!canSubmit?"#1a2d4a":T.accent,color:!canSubmit?T.muted:"#fff",border:"none",borderRadius:13,padding:"15px",fontWeight:700,fontSize:14,cursor:!canSubmit?"not-allowed":"pointer"}}>
              ✓ Registrar tiro
            </button>
          </>
        ):(
          <>
            <div><SectionLabel>TIPO DE SANCIÓN</SectionLabel>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                {[{k:"exclusion",l:"⏱ Exclusión 2'",c:T.orange},{k:"timeout",l:"⏸ Tiempo Muerto",c:T.yellow},{k:"red_card",l:"🟥 Tarjeta Roja",c:T.red},{k:"half_time",l:"🔔 Descanso",c:T.purple}].map(s=>(
                  <button key={s.k} onClick={()=>lupd("type",s.k)}
                    style={{background:lForm.type===s.k?s.c+"22":T.card2,color:lForm.type===s.k?s.c:T.muted,
                      border:`1.5px solid ${lForm.type===s.k?s.c:T.border}`,borderRadius:11,padding:"11px 10px",fontWeight:700,fontSize:12,cursor:"pointer"}}>{s.l}</button>
                ))}
              </div>
            </div>
            <div><SectionLabel>EQUIPO</SectionLabel>
              <div style={{display:"flex",gap:7}}>
                {[{k:"home",t:homeTeam},{k:"away",t:awayTeam}].map(({k,t})=>(
                  <button key={k} onClick={()=>lupd("team",k)}
                    style={{flex:1,background:lForm.team===k?t.color+"22":T.card2,color:lForm.team===k?t.color:T.muted,
                      border:`1.5px solid ${lForm.team===k?t.color:T.border}`,borderRadius:11,padding:"11px",fontWeight:700,fontSize:13,cursor:"pointer"}}>{t.name}</button>
                ))}
              </div>
            </div>
            <div><SectionLabel>MINUTO</SectionLabel>
              <input type="number" value={lForm.minute} onChange={e=>lupd("minute",e.target.value)} min="1" max="60"
                style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px 16px",color:T.text,fontSize:16,fontWeight:800,width:"100%"}}/>
            </div>
            {lForm.type!=="timeout"&&lForm.type!=="half_time"&&(
              <PlayerPicker players={currentTeam.players} value={lForm.sanctioned}
                onChange={v=>lupd("sanctioned",v)} label="JUGADOR SANCIONADO" accent={EV_TYPES[lForm.type]?.color}/>
            )}
            <button onClick={lSubmitDisc} style={{background:EV_TYPES[lForm.type]?.color||T.accent,color:"#fff",border:"none",borderRadius:13,padding:"15px",fontWeight:700,fontSize:14,cursor:"pointer"}}>
              ✓ Confirmar {EV_TYPES[lForm.type]?.label}
            </button>
          </>
        )}
        {events.length>0&&(
          <div style={{marginTop:4}}>
            <SectionLabel>ÚLTIMOS EVENTOS</SectionLabel>
            <div style={{position:"relative",paddingLeft:14}}>
              <div style={{position:"absolute",left:14,top:0,bottom:0,width:2,background:T.border,borderRadius:1}}/>
              {[...events].reverse().slice(0,5).map(ev=>(
                <EventCard key={ev.id} ev={ev} homeColor={homeTeam.color} awayColor={awayTeam.color} homeName={homeTeam.name} awayName={awayTeam.name}/>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom:12}}>
        <div style={{fontSize:10,color:T.accent,letterSpacing:3,textTransform:"uppercase",marginBottom:4}}>Partido en Vivo</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:20,fontWeight:800,color:T.text}}>Registrar</div>
            <div style={{fontSize:12,color:T.muted}}>{matchInfo?.home||"GEI"} vs {matchInfo?.away||"Bernal"}</div>
          </div>
          <div style={{display:"flex",gap:7,alignItems:"center"}}>
            {matchStatus==="live"&&regMode!=="pending"&&(
              <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:3,display:"flex",gap:3}}>
                {[{k:"quick",l:"⚡ Rápido"},{k:"full",l:"📋 Completo"}].map(m=>(
                  <button key={m.k} onClick={()=>setRegMode(m.k)}
                    style={{background:regMode===m.k?T.accent:"transparent",color:regMode===m.k?"#fff":T.muted,
                      border:"none",borderRadius:9,padding:"7px 10px",fontSize:11,fontWeight:700,cursor:"pointer",transition:"all .15s"}}>
                    {m.l}
                  </button>
                ))}
              </div>
            )}
            {matchStatus==="live"&&(
              <button onClick={onCloseMatch}
                style={{background:"rgba(239,68,68,.15)",border:"1px solid rgba(239,68,68,.4)",color:"#fca5a5",borderRadius:10,padding:"8px 11px",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                🏁 Cerrar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* No match in progress */}
      {matchStatus==="idle"&&(
        <div style={{textAlign:"center",padding:"40px 20px"}}>
          <div style={{fontSize:44,marginBottom:12}}>🤾</div>
          <div style={{fontSize:16,fontWeight:800,color:T.text,marginBottom:6}}>Sin partido en curso</div>
          <div style={{fontSize:12,color:T.muted,marginBottom:20}}>Iniciá un nuevo partido para empezar a registrar eventos.</div>
          <button onClick={onStartMatch}
            style={{background:`linear-gradient(135deg,${T.accent},${T.cyan})`,color:"#fff",border:"none",borderRadius:13,padding:"13px 28px",fontWeight:700,fontSize:14,cursor:"pointer"}}>
            + Nuevo partido
          </button>
        </div>
      )}

      {matchStatus==="live"&&<>
      <Scoreboard/>
      <KPIBar/>
      {regMode==="quick"&&<QuickMode/>}
      {regMode==="full"&&<FullMode/>}
      {regMode==="pending"&&<PendingMode/>}
      </>}

      {/* Modals */}
      {step==="shot_detail"&&(
        <ShotModal
          form={form} upd={upd}
          onClose={()=>{setStep(null);setCompletingId(null);}}
          onSubmit={submitFull}
          homeTeam={homeTeam} awayTeam={awayTeam}
          title={completingId?"📋 Completar datos del tiro":"🎯 Registrar Tiro"}
        />
      )}
      {step==="disc_quick"&&(
        <DiscModal
          form={form} upd={upd}
          onClose={()=>setStep(null)}
          onSubmit={submitDisc}
          homeTeam={homeTeam} awayTeam={awayTeam}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  EVOLUTION PAGE (with detailed timeline)
// ═══════════════════════════════════════════════════
function EvolutionPage({goBack,match:matchProp}) {
  const matchData=matchProp||{home:"GEI",away:"Bernal",hs:10,as:6,date:"01/06",events:DEMO_EVENTS};
  const homeTeam=INIT_TEAMS[0];
  const awayTeam=INIT_TEAMS[1];
  const [filter,setFilter]=useState("all");
  const [aiResult,setAiResult]=useState(null);
  const [aiLoading,setAiLoading]=useState(false);
  const [aiError,setAiError]=useState(null);
  const [aiFocus,setAiFocus]=useState("complete");

  const events=matchData.events?.length?matchData.events:DEMO_EVENTS;
  const filtered=filter==="all"?events:events.filter(e=>e.type===filter||e.type==="half_time");

  const stats={
    homeGoals:events.filter(e=>e.type==="goal"&&e.team==="home").length,
    awayGoals:events.filter(e=>e.type==="goal"&&e.team==="away").length,
    homeExcl:events.filter(e=>e.type==="exclusion"&&e.team==="home").length,
    awayExcl:events.filter(e=>e.type==="exclusion"&&e.team==="away").length,
    homeTimeouts:events.filter(e=>e.type==="timeout"&&e.team==="home").length,
    awayTimeouts:events.filter(e=>e.type==="timeout"&&e.team==="away").length,
    homeRed:events.filter(e=>e.type==="red_card"&&e.team==="home").length,
    awayRed:events.filter(e=>e.type==="red_card"&&e.team==="away").length,
    homeBlue:events.filter(e=>e.type==="blue_card"&&e.team==="home").length,
    awayBlue:events.filter(e=>e.type==="blue_card"&&e.team==="away").length,
  };

  const scorerMap={};
  events.filter(e=>e.type==="goal"&&e.shooter).forEach(e=>{
    const k=`${e.team}_${e.shooter.name}`;
    if(!scorerMap[k]) scorerMap[k]={...e.shooter,team:e.team,goals:0};
    scorerMap[k].goals++;
  });
  const scorers=Object.values(scorerMap).sort((a,b)=>b.goals-a.goals).slice(0,5);

  const analyze=async()=>{
    setAiLoading(true);setAiError(null);setAiResult(null);
    const focusMap={
      complete:"Realizá un análisis táctico completo del partido",
      attack:"Analizá el rendimiento ofensivo de ambos equipos",
      defense:"Analizá el rendimiento defensivo y disciplinario",
      goalkeeper:"Analizá el desempeño del arquero y situaciones de gol",
    };
    try {
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",max_tokens:900,
          system:`Sos un analista táctico de handball experto. Respondé en español de forma concreta.
Secciones: 📋 RESUMEN · ⚔️ ATAQUE · 🛡️ DEFENSA · ⭐ JUGADOR DESTACADO · 📈 TENDENCIAS · 🎯 RECOMENDACIONES
Máximo 400 palabras. Terminología técnica de handball.`,
          messages:[{role:"user",content:`${focusMap[aiFocus]}.
Partido: ${matchData.home} ${matchData.hs} - ${matchData.as} ${matchData.away}
Exclusiones: ${matchData.home} ${stats.homeExcl} - ${matchData.away} ${stats.awayExcl}
Tiempos muertos: ${matchData.home} ${stats.homeTimeouts} - ${matchData.away} ${stats.awayTimeouts}
Tarjetas rojas: ${matchData.home} ${stats.homeRed} - ${matchData.away} ${stats.awayRed}
Goleadores: ${scorers.map(s=>`${s.name} (${s.goals} goles - ${s.team==="home"?matchData.home:matchData.away})`).join(", ")}`}],
        }),
      });
      const data=await res.json();
      const text=data.content?.map(b=>b.text||"").join("")||"";
      if(!text) throw new Error();
      setAiResult(text);
    } catch{setAiError("Error al conectar. Intentá de nuevo.");}
    finally{setAiLoading(false);}
  };

  return (
    <div>
      <button onClick={goBack} style={{background:"transparent",border:"none",color:T.muted,fontSize:13,cursor:"pointer",marginBottom:16,padding:0,display:"flex",alignItems:"center",gap:6}}>← Volver</button>
      <div style={{marginBottom:18}}>
        <div style={{fontSize:10,color:T.accent,letterSpacing:3,textTransform:"uppercase",marginBottom:4}}>Evolución del Partido</div>
        <div style={{fontSize:20,fontWeight:800,color:T.text}}>{matchData.home} vs {matchData.away}</div>
        <div style={{fontSize:12,color:T.muted}}>{matchData.date}</div>
      </div>

      {/* Final score */}
      <div style={{background:`linear-gradient(135deg,${homeTeam.color}20,${awayTeam.color}20)`,
        borderRadius:14,padding:"16px 18px",border:`1px solid ${T.border}`,marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{textAlign:"center",flex:1}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,marginBottom:5}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:homeTeam.color}}/>
              <span style={{fontSize:13,fontWeight:800,color:T.text}}>{matchData.home}</span>
            </div>
            <div style={{fontSize:48,fontWeight:900,color:homeTeam.color,lineHeight:1}}>{matchData.hs}</div>
          </div>
          <div style={{textAlign:"center",padding:"0 14px"}}>
            <div style={{fontSize:10,color:T.muted,letterSpacing:2}}>FINAL</div>
            <div style={{fontSize:18,color:T.muted}}>–</div>
          </div>
          <div style={{textAlign:"center",flex:1}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,marginBottom:5}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:awayTeam.color}}/>
              <span style={{fontSize:13,fontWeight:800,color:T.text}}>{matchData.away}</span>
            </div>
            <div style={{fontSize:48,fontWeight:900,color:awayTeam.color,lineHeight:1}}>{matchData.as}</div>
          </div>
        </div>
      </div>

      {/* Score chart */}
      <Card style={{marginBottom:14}}>
        <div style={{padding:"14px 16px"}}>
          <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:12}}>📈 Evolución del marcador</div>
          <ScoreChart events={events} homeColor={homeTeam.color} awayColor={awayTeam.color}/>
          <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:8}}>
            {[{c:homeTeam.color,l:matchData.home},{c:awayTeam.color,l:matchData.away},{c:"#8b5cf6",l:"Descanso",dash:true}].map(x=>(
              <div key={x.l} style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:16,height:x.dash?1:3,background:x.c,borderRadius:2,
                  borderTop:x.dash?`2px dashed ${x.c}`:undefined}}/>
                <span style={{fontSize:10,color:T.muted}}>{x.l}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Stats comparison */}
      <Card style={{marginBottom:14}}>
        <div style={{padding:"14px 16px"}}>
          <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:14}}>📊 Estadísticas</div>
          {[
            {l:"Goles",h:stats.homeGoals,a:stats.awayGoals,i:"⚽"},
            {l:"Exclusiones 2'",h:stats.homeExcl,a:stats.awayExcl,i:"⏱"},
            {l:"Tiempos muertos",h:stats.homeTimeouts,a:stats.awayTimeouts,i:"⏸"},
            {l:"Tarjetas rojas",h:stats.homeRed,a:stats.awayRed,i:"🟥"},
            {l:"Tarjetas azules",h:stats.homeBlue,a:stats.awayBlue,i:"🟦"},
          ].map(row=>{
            const tot=row.h+row.a||1;
            return (
              <div key={row.l} style={{marginBottom:11}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <span style={{fontSize:15,fontWeight:800,color:homeTeam.color}}>{row.h}</span>
                  <span style={{fontSize:11,color:T.muted}}>{row.i} {row.l}</span>
                  <span style={{fontSize:15,fontWeight:800,color:awayTeam.color}}>{row.a}</span>
                </div>
                <div style={{height:5,borderRadius:3,background:T.border,display:"flex",overflow:"hidden"}}>
                  <div style={{width:`${row.h/tot*100}%`,background:homeTeam.color}}/>
                  <div style={{width:`${row.a/tot*100}%`,background:awayTeam.color,marginLeft:"auto"}}/>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Scorers */}
      {scorers.length>0&&(
        <Card style={{marginBottom:14}}>
          <div style={{padding:"14px 16px"}}>
            <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:12}}>⚽ Goleadores</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {scorers.map((s,i)=>{
                const tc=s.team==="home"?homeTeam.color:awayTeam.color;
                const medals=["🥇","🥈","🥉"];
                return (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",
                    background:tc+"0e",borderRadius:10,border:`1px solid ${tc}22`}}>
                    <span style={{fontSize:14}}>{medals[i]||"  "}</span>
                    <div style={{width:30,height:30,borderRadius:"50%",background:tc+"22",
                      border:`1.5px solid ${tc}55`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{fontSize:10,fontWeight:800,color:tc}}>#{s.number}</span>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:T.text}}>{s.name}</div>
                      <div style={{fontSize:10,color:T.muted}}>{s.team==="home"?matchData.home:matchData.away}</div>
                    </div>
                    <Badge label={`${s.goals} gol${s.goals!==1?"es":""}`} color={tc}/>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Timeline filter */}
      <SectionLabel>LÍNEA DE TIEMPO</SectionLabel>
      <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto",paddingBottom:4}}>
        {[
          {k:"all",l:"📋 Todo"},{k:"goal",l:"⚽ Goles"},
          {k:"exclusion",l:"⏱ Excl."},{k:"timeout",l:"⏸ T.M."},
          {k:"red_card",l:"🟥 Roja"},{k:"blue_card",l:"🟦 Azul"},
          {k:"saved",l:"🧤 Atajadas"},{k:"miss",l:"❌ Errados"},
        ].map(f=>(
          <button key={f.k} onClick={()=>setFilter(f.k)}
            style={{flexShrink:0,background:filter===f.k?T.accent+"22":T.card,
              color:filter===f.k?T.accent:T.muted,
              border:`1px solid ${filter===f.k?T.accent:T.border}`,
              borderRadius:20,padding:"6px 12px",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
            {f.l}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div style={{position:"relative",paddingLeft:14,marginBottom:24}}>
        <div style={{position:"absolute",left:14,top:0,bottom:0,width:2,background:T.border,borderRadius:1}}/>
        {filtered.map(ev=>(
          <EventCard key={ev.id} ev={ev}
            homeColor={homeTeam.color} awayColor={awayTeam.color}
            homeName={matchData.home} awayName={matchData.away}/>
        ))}
      </div>

      {/* AI Analysis */}
      <div style={{background:`linear-gradient(135deg,${T.accent}10,${T.cyan}08)`,
        borderRadius:16,border:`1px solid ${T.accent}30`,padding:18,marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <span style={{fontSize:22}}>🤖</span>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:T.text}}>Análisis IA del Partido</div>
            <div style={{fontSize:11,color:T.muted}}>Análisis táctico generado por inteligencia artificial</div>
          </div>
        </div>
        <div style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.25)",
          borderRadius:10,padding:"10px 14px",marginBottom:14}}>
          <div style={{display:"flex",gap:8}}>
            <span style={{fontSize:13,flexShrink:0}}>⚠️</span>
            <div style={{fontSize:11,color:"#fbbf24",lineHeight:1.6}}>
              <strong>Aviso importante:</strong> Este análisis es generado por inteligencia artificial con fines orientativos. No debe tomarse como verdad absoluta ni reemplazar el criterio del cuerpo técnico. Es una herramienta de apoyo para el análisis a mediano y largo plazo.
            </div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
          {[{k:"complete",l:"🔍 Completo"},{k:"attack",l:"⚔️ Ataque"},{k:"defense",l:"🛡️ Defensa"},{k:"goalkeeper",l:"🧤 Arquero"}].map(f=>(
            <button key={f.k} onClick={()=>setAiFocus(f.k)}
              style={{background:aiFocus===f.k?T.accent+"22":T.card,color:aiFocus===f.k?T.accent:T.muted,
                border:`1px solid ${aiFocus===f.k?T.accent:T.border}`,borderRadius:10,padding:"10px 8px",cursor:"pointer"}}>
              <div style={{fontSize:12,fontWeight:700}}>{f.l}</div>
            </button>
          ))}
        </div>
        {!aiLoading&&!aiResult&&(
          <button onClick={analyze} style={{width:"100%",background:`linear-gradient(135deg,${T.accent},${T.cyan})`,
            color:"#fff",border:"none",borderRadius:12,padding:"14px",fontWeight:700,fontSize:14,cursor:"pointer"}}>
            ⚡ Analizar con IA
          </button>
        )}
        {aiLoading&&<div style={{textAlign:"center",padding:"22px 0"}}>
          <div style={{fontSize:32,display:"inline-block",animation:"spin 1s linear infinite"}}>⚙️</div>
          <div style={{fontSize:12,color:T.accent,letterSpacing:3,marginTop:8}}>ANALIZANDO...</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>}
        {aiError&&<div style={{textAlign:"center",color:T.red,fontSize:12,padding:12}}>{aiError}<br/>
          <button onClick={analyze} style={{marginTop:8,background:T.card2,color:T.text,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:11}}>Reintentar</button>
        </div>}
        {aiResult&&<div>
          <div style={{background:T.card,borderRadius:12,padding:16,border:`1px solid ${T.border}`,marginBottom:10}}>
            <div style={{fontSize:12,color:T.text,lineHeight:1.82,whiteSpace:"pre-wrap"}}>{aiResult}</div>
          </div>
          <button onClick={analyze} style={{width:"100%",background:T.card2,color:T.muted,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px",cursor:"pointer",fontSize:12}}>🔄 Re-analizar</button>
        </div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  SIMPLE STUBS (Teams, Stats, AI)
// ═══════════════════════════════════════════════════
function TeamsStub() {
  return (
    <div>
      <div style={{marginBottom:18}}>
        <div style={{fontSize:10,color:T.accent,letterSpacing:3,textTransform:"uppercase",marginBottom:4}}>Gestión</div>
        <div style={{fontSize:22,fontWeight:800,color:T.text}}>Equipos</div>
      </div>
      {INIT_TEAMS.map(t=>(
        <div key={t.id} style={{background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:16,marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
            <div style={{width:42,height:42,borderRadius:12,background:t.color+"22",border:`2px solid ${t.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🏆</div>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:800,color:T.text}}>{t.name}</div>
              <div style={{fontSize:11,color:T.muted}}>{t.players.length} jugadores · {t.wins}V {t.draws}E {t.losses}D</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {t.players.map(p=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",background:T.card2,borderRadius:9,border:`1px solid ${T.border}`}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:t.color+"22",border:`1px solid ${t.color}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{fontSize:9,fontWeight:800,color:t.color}}>#{p.number}</span>
                </div>
                <div style={{flex:1}}>
                  <span style={{fontSize:12,fontWeight:700,color:T.text}}>{p.name}</span>
                  <span style={{fontSize:10,color:T.muted,marginLeft:8}}>{p.pos}</span>
                </div>
                {p.pos==="Arquero"&&<Badge label="GK" color="#60a5fa"/>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── demo shots dataset ──────────────────────────────
const INIT_SHOTS = [
  {zone:"left_wing", result:"goal",  player:"Martínez",  number:7,  quadrant:2},
  {zone:"left_wing", result:"goal",  player:"Martínez",  number:7,  quadrant:0},
  {zone:"left_wing", result:"miss",  player:"Torres",    number:13, quadrant:6},
  {zone:"left_wing", result:"saved", player:"Torres",    number:13, quadrant:3},
  {zone:"left_back", result:"goal",  player:"López",     number:5,  quadrant:1},
  {zone:"left_back", result:"goal",  player:"López",     number:5,  quadrant:4},
  {zone:"left_back", result:"goal",  player:"Rodríguez", number:11, quadrant:5},
  {zone:"left_back", result:"saved", player:"López",     number:5,  quadrant:7},
  {zone:"left_back", result:"miss",  player:"Rodríguez", number:11, quadrant:8},
  {zone:"center",    result:"goal",  player:"López",     number:5,  quadrant:4},
  {zone:"center",    result:"goal",  player:"Rodríguez", number:11, quadrant:1},
  {zone:"center",    result:"saved", player:"López",     number:5,  quadrant:3},
  {zone:"center",    result:"saved", player:"Rodríguez", number:11, quadrant:7},
  {zone:"center",    result:"miss",  player:"López",     number:5,  quadrant:6},
  {zone:"right_back",result:"goal",  player:"Rodríguez", number:11, quadrant:2},
  {zone:"right_back",result:"miss",  player:"Pérez",     number:9,  quadrant:8},
  {zone:"right_back",result:"miss",  player:"Pérez",     number:9,  quadrant:6},
  {zone:"right_back",result:"saved", player:"Rodríguez", number:11, quadrant:5},
  {zone:"right_wing",result:"miss",  player:"Torres",    number:13, quadrant:2},
  {zone:"right_wing",result:"miss",  player:"Torres",    number:13, quadrant:8},
  {zone:"right_wing",result:"saved", player:"Torres",    number:13, quadrant:5},
  {zone:"pivot",     result:"goal",  player:"Pérez",     number:9,  quadrant:4},
  {zone:"pivot",     result:"goal",  player:"Pérez",     number:9,  quadrant:3},
  {zone:"pivot",     result:"saved", player:"Pérez",     number:9,  quadrant:7},
];

// ── GoalMap: 9-quadrant heatmap ──────────────────────
function GoalMap({byQ, mode}) {
  const [hov,setHov]=useState(null);
  const W=270,H=162,cw=W/3,ch=H/3;
  const getVal=q=>mode==="goals"?q.goals:mode==="saved"?q.saved:mode==="miss"?q.miss:q.total;
  const maxVal=Math.max(...byQ.map(q=>getVal(q)),1);
  const getColor=q=>{
    const v=getVal(q);if(!v) return "rgba(255,255,255,0.04)";
    const a=Math.min(0.82,0.18+v/maxVal*0.64);
    if(mode==="goals") return `rgba(34,197,94,${a})`;
    if(mode==="saved") return `rgba(96,165,250,${a})`;
    if(mode==="miss")  return `rgba(239,68,68,${a})`;
    return `rgba(245,158,11,${a})`;
  };
  return (
    <div style={{position:"relative",maxWidth:290,margin:"0 auto"}}>
      {/* Crossbar top */}
      <div style={{position:"absolute",top:-3,left:7,right:7,height:4,background:"#cbd5e1",borderRadius:2,zIndex:3}}/>
      <div style={{position:"absolute",top:0,left:7,bottom:0,width:4,background:"#cbd5e1",borderRadius:2,zIndex:3}}/>
      <div style={{position:"absolute",top:0,right:7,bottom:0,width:4,background:"#cbd5e1",borderRadius:2,zIndex:3}}/>
      <svg width={W} height={H} style={{display:"block",margin:"0 8px",background:"#0a1a30",borderRadius:6,border:`1px solid ${T.border}`}}>
        {byQ.map((q,i)=>{
          const col=i%3, row=Math.floor(i/3);
          const x=col*cw, y=row*ch;
          const v=getVal(q);
          const sel=hov===i;
          return (
            <g key={i} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
              <rect x={x+1} y={y+1} width={cw-2} height={ch-2}
                fill={getColor(q)}
                stroke={sel?"rgba(255,255,255,.6)":T.border}
                strokeWidth={sel?2:1} rx={3}/>
              {v>0&&<text x={x+cw/2} y={y+ch/2+6} textAnchor="middle"
                fill="#fff" fontSize={22} fontWeight="900"
                style={{filter:"drop-shadow(0 1px 4px rgba(0,0,0,.9))"}}>{v}</text>}
              <text x={x+cw/2} y={y+ch/2+20} textAnchor="middle"
                fill={v>0?"rgba(255,255,255,.55)":T.muted} fontSize={9}>{QUADRANTS[i].label}</text>
            </g>
          );
        })}
        {/* Grid lines */}
        <line x1={cw}   y1={0} x2={cw}   y2={H} stroke={T.border} strokeWidth={1.5}/>
        <line x1={cw*2} y1={0} x2={cw*2} y2={H} stroke={T.border} strokeWidth={1.5}/>
        <line x1={0} y1={ch}   x2={W}    y2={ch} stroke={T.border} strokeWidth={1.5}/>
        <line x1={0} y1={ch*2} x2={W}    y2={ch*2} stroke={T.border} strokeWidth={1.5}/>
      </svg>
      <div style={{textAlign:"center",fontSize:9,color:T.muted,marginTop:6}}>Vista del arquero — de izquierda a derecha</div>
    </div>
  );
}

// ── StatsCourt: interactive court heatmap ────────────
function StatsCourt({shots}) {
  const [hov,setHov]=useState(null);
  const [selZone,setSelZone]=useState(null);
  const [mode,setMode]=useState("goals");
  const [detailTab,setDetailTab]=useState("goals");

  const zoneStats=useMemo(()=>
    Object.keys(ZONES).reduce((a,z)=>{
      const zs=shots.filter(s=>s.zone===z);
      a[z]={goals:zs.filter(s=>s.result==="goal").length,
             saved:zs.filter(s=>s.result==="saved").length,
             miss:zs.filter(s=>s.result==="miss").length,
             total:zs.length,shots:zs};
      return a;
    },{}),[shots]);

  const getVal=k=>mode==="goals"?zoneStats[k]?.goals:mode==="saved"?zoneStats[k]?.saved:mode==="miss"?zoneStats[k]?.miss:zoneStats[k]?.total;
  const maxVal=Math.max(...Object.keys(ZONES).map(k=>getVal(k)),1);
  const modeColor=mode==="goals"?T.green:mode==="saved"?"#60a5fa":mode==="miss"?T.red:T.yellow;

  const heatFill=k=>{
    const v=getVal(k);if(!v) return "rgba(255,255,255,0.04)";
    const a=Math.min(0.75,0.18+v/maxVal*0.57);
    if(mode==="goals") return `rgba(34,197,94,${a})`;
    if(mode==="saved") return `rgba(96,165,250,${a})`;
    if(mode==="miss")  return `rgba(239,68,68,${a})`;
    return `rgba(245,158,11,${a})`;
  };

  const selData=selZone?zoneStats[selZone]:null;
  const dtShots=selZone?zoneStats[selZone].shots.filter(s=>s.result===(detailTab==="goals"?"goal":detailTab==="saved"?"saved":"miss")):[];

  const modes=[
    {k:"goals",l:"⚽ Goles",   c:T.green},
    {k:"saved",l:"🧤 Atajados",c:"#60a5fa"},
    {k:"miss", l:"❌ Errados", c:T.red},
    {k:"total",l:"📊 Total",   c:T.yellow},
  ];

  return (
    <div>
      {/* Mode pills */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {modes.map(m=>(
          <button key={m.k} onClick={()=>setMode(m.k)}
            style={{flex:1,minWidth:60,background:mode===m.k?m.c+"28":T.card,
              color:mode===m.k?m.c:T.muted,
              border:`1px solid ${mode===m.k?m.c:T.border}`,
              borderRadius:9,padding:"7px 4px",fontSize:10,fontWeight:700,cursor:"pointer"}}>
            {m.l}
          </button>
        ))}
      </div>

      {/* Court SVG */}
      <div style={{background:"#0f2a5a",borderRadius:14,padding:"12px 8px",border:"1px solid #1e407a",marginBottom:10}}>
        <svg viewBox="-8 -28 296 190" width="100%" preserveAspectRatio="xMidYMid meet"
          style={{display:"block",maxWidth:360,margin:"0 auto"}}>
          <rect x="-8" y="-28" width="296" height="190" fill="#0f2a5a" rx="8"/>
          <rect x="0" y="0" width="280" height="155" fill="#2196c4" rx="4"/>
          <path d="M 56 0 A 84 84 0 0 1 224 0 Z" fill="#1565a0"/>

          {Object.entries(ZONES).map(([key,zone])=>(
            <path key={key} d={zone.path}
              fill={selZone===key?zone.color+"55":heatFill(key)}
              stroke={selZone===key?"#fff":hov===key?"rgba(255,255,255,.55)":"rgba(255,255,255,.15)"}
              strokeWidth={selZone===key?2.5:hov===key?1.5:1}
              style={{cursor:"pointer",transition:"all .15s"}}
              onMouseEnter={()=>setHov(key)} onMouseLeave={()=>setHov(null)}
              onClick={()=>{setSelZone(selZone===key?null:key);setDetailTab("goals");}}
            />
          ))}

          {/* Court lines */}
          <rect x="0" y="0" width="280" height="155" fill="none" stroke="white" strokeWidth="2" rx="4"/>
          <path d="M 56 0 A 84 84 0 0 1 224 0" fill="none" stroke="white" strokeWidth="2"/>
          <path d="M 14 0 A 126 126 0 0 1 266 0" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="7 4" opacity=".8"/>
          <circle cx="140" cy="98" r="3" fill="white"/>
          <line x1="67" y1="42" x2="31" y2="63" stroke="white" strokeWidth="1.2" opacity=".5"/>
          <line x1="98" y1="73" x2="77" y2="109" stroke="white" strokeWidth="1.2" opacity=".5"/>
          <line x1="182" y1="73" x2="203" y2="109" stroke="white" strokeWidth="1.2" opacity=".5"/>
          <line x1="213" y1="42" x2="249" y2="63" stroke="white" strokeWidth="1.2" opacity=".5"/>
          <rect x="119" y="-22" width="42" height="22" fill="#081220" stroke="white" strokeWidth="2" rx="2"/>
          <text x="140" y="-8" textAnchor="middle" fill="rgba(255,255,255,.4)" fontSize="6.5" fontWeight="700">ARCO</text>

          {/* Labels + values */}
          {Object.entries(ZONES).map(([key,zone])=>{
            const v=getVal(key)||0;
            return (
              <g key={`lbl-${key}`} style={{pointerEvents:"none"}}>
                <text x={zone.lx} y={zone.ly-4} textAnchor="middle"
                  fill={selZone===key?"#fff":"rgba(255,255,255,.7)"} fontSize="9" fontWeight="700">
                  {zone.short}
                </text>
                {v>0&&<text x={zone.lx} y={zone.ly+14} textAnchor="middle"
                  fill={modeColor} fontSize="20" fontWeight="900"
                  style={{filter:"drop-shadow(0 1px 5px rgba(0,0,0,.95))"}}>
                  {v}
                </text>}
              </g>
            );
          })}
        </svg>
        <div style={{textAlign:"center",fontSize:9,color:"rgba(255,255,255,.3)",marginTop:4}}>
          Tocá una zona para ver el detalle
        </div>
      </div>

      {/* Zone detail */}
      {selZone&&selData&&(
        <div style={{background:T.card2,borderRadius:14,border:`1px solid ${ZONES[selZone].color}44`,overflow:"hidden",animation:"zpop .2s ease"}}>
          <style>{`@keyframes zpop{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}`}</style>

          {/* Header */}
          <div style={{padding:"13px 16px 10px",borderBottom:`1px solid ${T.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontWeight:800,fontSize:15,color:ZONES[selZone].color}}>
                {ZONES[selZone].emoji} {ZONES[selZone].label}
              </span>
              <span style={{fontSize:11,color:T.muted}}>{selData.total} tiros</span>
            </div>
            {/* Mini stat cards */}
            <div style={{display:"flex",gap:7,marginBottom:10}}>
              {[{l:"Goles",v:selData.goals,c:T.green},{l:"Atajados",v:selData.saved,c:"#60a5fa"},{l:"Errados",v:selData.miss,c:T.red}].map(x=>(
                <div key={x.l} style={{flex:1,textAlign:"center",borderRadius:9,padding:"8px 4px",
                  background:x.c+"12",border:`1px solid ${x.c}28`}}>
                  <div style={{fontSize:20,fontWeight:800,color:x.c,lineHeight:1}}>{x.v}</div>
                  <div style={{fontSize:9,color:T.muted,margin:"2px 0"}}>{x.l}</div>
                  <div style={{fontSize:10,fontWeight:700,color:x.c}}>
                    {selData.total?Math.round(x.v/selData.total*100):0}%
                  </div>
                </div>
              ))}
            </div>
            {/* Progress bar */}
            <div style={{height:5,borderRadius:3,display:"flex",overflow:"hidden",background:T.border}}>
              <div style={{width:`${selData.total?selData.goals/selData.total*100:0}%`,background:T.green}}/>
              <div style={{width:`${selData.total?selData.saved/selData.total*100:0}%`,background:"#60a5fa"}}/>
              <div style={{width:`${selData.total?selData.miss/selData.total*100:0}%`,background:T.red}}/>
            </div>
          </div>

          {/* Sub-tabs */}
          <div style={{display:"flex",borderBottom:`1px solid ${T.border}`}}>
            {[{k:"goals",l:"⚽ Goles",c:T.green,n:selData.goals},
              {k:"saved",l:"🧤 Atajados",c:"#60a5fa",n:selData.saved},
              {k:"miss", l:"❌ Errados",c:T.red,n:selData.miss}].map(t=>(
              <button key={t.k} onClick={()=>setDetailTab(t.k)}
                style={{flex:1,background:"transparent",border:"none",
                  borderBottom:`2px solid ${detailTab===t.k?t.c:"transparent"}`,
                  color:detailTab===t.k?t.c:T.muted,padding:"10px 4px",fontSize:10,fontWeight:700,cursor:"pointer"}}>
                {t.l} <span style={{background:t.c+"22",color:t.c,borderRadius:10,
                  padding:"1px 6px",fontSize:9,marginLeft:2}}>{t.n}</span>
              </button>
            ))}
          </div>

          {/* Shot list */}
          <div style={{padding:"10px 14px",minHeight:60}}>
            {dtShots.length===0
              ?<div style={{textAlign:"center",padding:"14px 0",color:T.muted,fontSize:12}}>Sin registros</div>
              :<div style={{display:"flex",flexDirection:"column",gap:7}}>
                {dtShots.map((s,i)=>{
                  const c=s.result==="goal"?T.green:s.result==="saved"?"#60a5fa":T.red;
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,
                      background:c+"0e",borderRadius:10,padding:"9px 12px",border:`1px solid ${c}28`}}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:c+"22",
                        border:`1.5px solid ${c}55`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <span style={{fontSize:11,fontWeight:800,color:c}}>#{s.number}</span>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:T.text}}>{s.player}</div>
                        <div style={{fontSize:10,color:T.muted}}>
                          → {QUADRANTS[s.quadrant]?.icon} {QUADRANTS[s.quadrant]?.label}
                        </div>
                      </div>
                      <span style={{fontSize:18}}>{s.result==="goal"?"⚽":s.result==="saved"?"🧤":"❌"}</span>
                    </div>
                  );
                })}
              </div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Full Stats Page ──────────────────────────────────
function StatsStub() {
  const shots=INIT_SHOTS;
  const [mainTab,setMainTab]=useState("court");
  const [goalMode,setGoalMode]=useState("goals");

  const totals=useMemo(()=>({
    total:shots.length,
    goals:shots.filter(s=>s.result==="goal").length,
    saved:shots.filter(s=>s.result==="saved").length,
    miss: shots.filter(s=>s.result==="miss").length,
  }),[shots]);
  const pct=totals.total?Math.round(totals.goals/totals.total*100):0;

  const byQ=useMemo(()=>Array.from({length:9},(_,i)=>{
    const qs=shots.filter(s=>s.quadrant===i);
    return {goals:qs.filter(s=>s.result==="goal").length,
            saved:qs.filter(s=>s.result==="saved").length,
            miss: qs.filter(s=>s.result==="miss").length,
            total:qs.length};
  }),[shots]);

  const playerMap=useMemo(()=>{
    const m={};
    shots.forEach(s=>{
      if(!m[s.player]) m[s.player]={player:s.player,number:s.number,goals:0,saved:0,miss:0};
      m[s.player][s.result==="goal"?"goals":s.result==="saved"?"saved":"miss"]++;
    });
    return Object.values(m).sort((a,b)=>b.goals-a.goals);
  },[shots]);

  const medals=["🥇","🥈","🥉"];

  return (
    <div>
      {onBack&&(
        <button onClick={onBack} style={{background:"transparent",border:"none",color:T.muted,fontSize:13,cursor:"pointer",marginBottom:12,padding:0,display:"flex",alignItems:"center",gap:6}}>
          ← Volver a Partidos
        </button>
      )}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:10,color:T.accent,letterSpacing:3,textTransform:"uppercase",marginBottom:4}}>Análisis</div>
        <div style={{fontSize:20,fontWeight:800,color:T.text}}>{matchTitle||"Estadísticas"}</div>
        {matchTitle&&<div style={{fontSize:11,color:T.muted,marginTop:2}}>Partido finalizado</div>}
      </div>

      {/* KPIs */}
      <div style={{display:"flex",gap:7,marginBottom:16}}>
        {[{l:"Tiros",v:totals.total,c:T.text},
          {l:"Goles",v:totals.goals,c:T.green},
          {l:"Conv.",v:`${pct}%`,c:pct>=50?T.green:T.yellow},
          {l:"Atajados",v:totals.saved,c:"#60a5fa"},
          {l:"Errados",v:totals.miss,c:T.red}].map(k=>(
          <div key={k.l} style={{flex:1,background:T.card,borderRadius:9,padding:"8px 4px",
            border:`1px solid ${T.border}`,textAlign:"center"}}>
            <div style={{fontSize:17,fontWeight:800,color:k.c,lineHeight:1}}>{k.v}</div>
            <div style={{fontSize:9,color:T.muted,marginTop:2}}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Main tabs */}
      <div style={{display:"flex",gap:6,marginBottom:16}}>
        {[{k:"court",l:"🏟 Cancha"},{k:"goal",l:"🥅 Arco"},{k:"players",l:"👥 Jugadores"}].map(t=>(
          <button key={t.k} onClick={()=>setMainTab(t.k)}
            style={{flex:1,background:mainTab===t.k?T.accent:T.card,
              color:mainTab===t.k?"#fff":T.muted,
              border:`1px solid ${mainTab===t.k?T.accent:T.border}`,
              borderRadius:9,padding:"9px 4px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Court tab */}
      {mainTab==="court"&&<StatsCourt shots={shots}/>}

      {/* Goal map tab */}
      {mainTab==="goal"&&(
        <div>
          <div style={{display:"flex",gap:6,marginBottom:14}}>
            {[{k:"goals",l:"⚽ Goles",c:T.green},{k:"saved",l:"🧤 Atajados",c:"#60a5fa"},
              {k:"miss",l:"❌ Errados",c:T.red},{k:"total",l:"📊 Total",c:T.yellow}].map(m=>(
              <button key={m.k} onClick={()=>setGoalMode(m.k)}
                style={{flex:1,background:goalMode===m.k?m.c+"28":T.card,
                  color:goalMode===m.k?m.c:T.muted,
                  border:`1px solid ${goalMode===m.k?m.c:T.border}`,
                  borderRadius:9,padding:"7px 2px",fontSize:10,fontWeight:700,cursor:"pointer"}}>
                {m.l}
              </button>
            ))}
          </div>
          <div style={{background:T.card,borderRadius:14,padding:"16px",border:`1px solid ${T.border}`}}>
            <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:14}}>🥅 Mapa del Arco — 9 Cuadrantes</div>
            <GoalMap byQ={byQ} mode={goalMode}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12}}>
            {(()=>{
              const best=[...byQ].reduce((a,b,i)=>b.goals>a.v?{v:b.goals,i}:a,{v:-1,i:0});
              const worst=[...byQ].reduce((a,b,i)=>b.miss>a.v?{v:b.miss,i}:a,{v:-1,i:0});
              return (<>
                <div style={{background:T.card,borderRadius:12,padding:14,border:`1px solid ${T.green}33`}}>
                  <div style={{fontSize:10,color:T.green,letterSpacing:1,marginBottom:6}}>🏆 MÁS GOLES</div>
                  <div style={{fontSize:20,fontWeight:800,color:T.green}}>{best.v} goles</div>
                  <div style={{fontSize:12,color:T.muted}}>{QUADRANTS[best.i]?.label}</div>
                </div>
                <div style={{background:T.card,borderRadius:12,padding:14,border:`1px solid ${T.red}33`}}>
                  <div style={{fontSize:10,color:T.red,letterSpacing:1,marginBottom:6}}>⚠️ MÁS ERRADOS</div>
                  <div style={{fontSize:20,fontWeight:800,color:T.red}}>{worst.v} errados</div>
                  <div style={{fontSize:12,color:T.muted}}>{QUADRANTS[worst.i]?.label}</div>
                </div>
              </>);
            })()}
          </div>
        </div>
      )}

      {/* Players tab */}
      {mainTab==="players"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {playerMap.map((p,i)=>{
            const tot=p.goals+p.saved+p.miss;
            const pct=tot?Math.round(p.goals/tot*100):0;
            return (
              <div key={p.player} style={{background:T.card,borderRadius:14,
                border:`1px solid ${T.border}`,padding:"14px 16px"}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                  <div style={{width:38,height:38,borderRadius:"50%",background:T.accent+"22",
                    border:`2px solid ${T.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:12,fontWeight:800,color:T.accent}}>#{p.number}</span>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:14,fontWeight:700,color:T.text}}>{p.player}</span>
                      {i<3&&<span style={{fontSize:14}}>{medals[i]}</span>}
                    </div>
                    <div style={{fontSize:11,color:T.muted}}>{tot} tiros · {pct}% conversión</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:6,marginBottom:8}}>
                  {[{l:"⚽",v:p.goals,c:T.green},{l:"🧤",v:p.saved,c:"#60a5fa"},{l:"❌",v:p.miss,c:T.red}].map(x=>(
                    <div key={x.l} style={{flex:1,textAlign:"center",borderRadius:8,padding:"7px 0",
                      background:x.c+"12",border:`1px solid ${x.c}28`}}>
                      <div style={{fontSize:18,fontWeight:800,color:x.c}}>{x.v}</div>
                      <div style={{fontSize:9,color:T.muted}}>{x.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{height:4,borderRadius:2,display:"flex",overflow:"hidden",background:T.border}}>
                  <div style={{width:`${tot?p.goals/tot*100:0}%`,background:T.green}}/>
                  <div style={{width:`${tot?p.saved/tot*100:0}%`,background:"#60a5fa"}}/>
                  <div style={{width:`${tot?p.miss/tot*100:0}%`,background:T.red}}/>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AIStub() {
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [focus,setFocus]=useState("general");
  const analyze=async()=>{
    setLoading(true);setResult(null);
    try {
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",max_tokens:800,
          system:"Sos analista de handball. Respondé en español, máx 300 palabras. Secciones: 🎯 DIAGNÓSTICO · 💪 FORTALEZAS · ⚠️ DEBILIDADES · 🏋️ PLAN · ♟️ TÁCTICA",
          messages:[{role:"user",content:`Analizá rendimiento general de handball con datos de ejemplo.`}],
        }),
      });
      const data=await res.json();
      setResult(data.content?.map(b=>b.text||"").join("")||"");
    } catch{}
    finally{setLoading(false);}
  };
  return (
    <div>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:10,color:T.accent,letterSpacing:3,textTransform:"uppercase",marginBottom:4}}>Inteligencia Artificial</div>
        <div style={{fontSize:22,fontWeight:800,color:T.text}}>Analizador IA</div>
      </div>
      <div style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.25)",borderRadius:12,padding:"12px 14px",marginBottom:18}}>
        <div style={{display:"flex",gap:8}}>
          <span>⚠️</span>
          <div style={{fontSize:11,color:"#fbbf24",lineHeight:1.6}}>
            <strong>Aviso:</strong> El análisis IA es orientativo y no reemplaza el criterio del cuerpo técnico. Es una herramienta de apoyo para el mediano y largo plazo.
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        {[{k:"general",l:"🎯 General"},{k:"attack",l:"⚔️ Ataque"},{k:"training",l:"🏋️ Entreno"},{k:"tactics",l:"♟️ Táctica"}].map(f=>(
          <button key={f.k} onClick={()=>setFocus(f.k)}
            style={{background:focus===f.k?T.accent+"22":T.card,color:focus===f.k?T.accent:T.muted,
              border:`1px solid ${focus===f.k?T.accent:T.border}`,borderRadius:11,padding:"12px",fontWeight:700,fontSize:12,cursor:"pointer"}}>
            {f.l}
          </button>
        ))}
      </div>
      {!loading&&!result&&<button onClick={analyze} style={{width:"100%",background:`linear-gradient(135deg,${T.accent},${T.cyan})`,color:"#fff",border:"none",borderRadius:13,padding:"15px",fontWeight:700,fontSize:14,cursor:"pointer"}}>⚡ Analizar con IA</button>}
      {loading&&<div style={{textAlign:"center",padding:"24px 0"}}><div style={{fontSize:32,display:"inline-block",animation:"spinAI 1s linear infinite"}}>⚙️</div><div style={{color:T.accent,fontSize:12,letterSpacing:3,marginTop:8}}>ANALIZANDO...</div><style>{`@keyframes spinAI{to{transform:rotate(360deg)}}`}</style></div>}
      {result&&<div style={{background:T.card,borderRadius:12,padding:16,border:`1px solid ${T.border}`}}><div style={{fontSize:12,color:T.text,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{result}</div></div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  STATS PAGE — recibe eventos como prop
// ═══════════════════════════════════════════════════
function StatsPage({liveEvents, matchEvents, matchTitle, onBack}){
  // matchEvents = eventos de un partido terminado (opcional)
  // liveEvents = eventos del partido en vivo
  const sourceEvents = matchEvents || liveEvents;
  // Derivar shots de eventos completos y rápidos por separado
  const fullShots = useMemo(()=>sourceEvents.filter(e=>["goal","miss","saved"].includes(e.type)&&e.completed&&e.zone!=null).map(e=>({
    zone:e.zone, result:e.type==="goal"?"goal":e.type==="saved"?"saved":"miss",
    player:e.shooter?.name||"?", number:e.shooter?.number||0, quadrant:e.quadrant??0,
    distance:e.distance||null, situation:e.situation||null, throwType:e.throwType||null,
  })),[sourceEvents]);

  const quickShots = useMemo(()=>sourceEvents.filter(e=>["goal","miss","saved"].includes(e.type)&&(!e.completed||e.quickMode)).map(e=>({
    zone:e.zone||null, result:e.type==="goal"?"goal":e.type==="saved"?"saved":"miss",
    player:"Sin datos", number:0, quadrant:null,
    team:e.team, situation:e.situation||null,
  })),[sourceEvents]);

  const [dataMode,setDataMode]=useState("full"); // "full" | "quick"
  const shots = dataMode==="full" ? fullShots : quickShots;

  const [mainTab,setMainTab]=useState("court");
  const [goalMode,setGoalMode]=useState("goals");

  const totals=useMemo(()=>({
    total:shots.length,
    goals:shots.filter(s=>s.result==="goal").length,
    saved:shots.filter(s=>s.result==="saved").length,
    miss: shots.filter(s=>s.result==="miss").length,
  }),[shots]);
  const pct=totals.total?Math.round(totals.goals/totals.total*100):0;

  const byQ=useMemo(()=>Array.from({length:9},(_,i)=>{
    const qs=shots.filter(s=>s.quadrant===i);
    return {goals:qs.filter(s=>s.result==="goal").length,
            saved:qs.filter(s=>s.result==="saved").length,
            miss: qs.filter(s=>s.result==="miss").length,
            total:qs.length};
  }),[shots]);

  const playerMap=useMemo(()=>{
    const m={};
    shots.forEach(s=>{
      if(!m[s.player])m[s.player]={player:s.player,number:s.number,goals:0,saved:0,miss:0};
      if(s.result==="goal")m[s.player].goals++;
      else if(s.result==="saved")m[s.player].saved++;
      else m[s.player].miss++;
    });
    return Object.values(m).sort((a,b)=>b.goals-a.goals);
  },[shots]);

  const noData = shots.length===0;

  return (
    <div>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:10,color:T.accent,letterSpacing:3,textTransform:"uppercase",marginBottom:4}}>Análisis</div>
        <div style={{fontSize:22,fontWeight:800,color:T.text}}>Estadísticas</div>
      </div>

      {/* Toggle registro rápido / completo */}
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:3,display:"flex",gap:3,marginBottom:12}}>
        <button onClick={()=>setDataMode("full")}
          style={{flex:1,background:dataMode==="full"?T.accent:"transparent",color:dataMode==="full"?"#fff":T.muted,
            border:"none",borderRadius:9,padding:"9px",fontSize:11,fontWeight:700,cursor:"pointer",transition:"all .15s"}}>
          📋 Registro completo <span style={{fontSize:10,opacity:.7}}>({fullShots.length})</span>
        </button>
        <button onClick={()=>setDataMode("quick")}
          style={{flex:1,background:dataMode==="quick"?T.yellow+"bb":"transparent",color:dataMode==="quick"?"#000":T.muted,
            border:"none",borderRadius:9,padding:"9px",fontSize:11,fontWeight:700,cursor:"pointer",transition:"all .15s"}}>
          ⚡ Registro rápido <span style={{fontSize:10,opacity:.7}}>({quickShots.length})</span>
        </button>
      </div>

      {dataMode==="quick"&&(
        <div style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.3)",borderRadius:10,padding:"9px 12px",marginBottom:12}}>
          <div style={{fontSize:11,color:T.yellow,lineHeight:1.5}}>⚠️ Datos de registro rápido — sin zona ni cuadrante. Solo muestra totales y ranking por equipo.</div>
        </div>
      )}

      {/* KPIs */}
      <div style={{display:"flex",gap:5,marginBottom:12}}>
        {[{l:"Tiros",v:totals.total,c:T.text},{l:"Goles",v:totals.goals,c:T.green},{l:"Conv.",v:`${pct}%`,c:pct>=50?T.green:T.yellow},{l:"Atajados",v:totals.saved,c:"#60a5fa"},{l:"Errados",v:totals.miss,c:T.red}].map(k=>(
          <div key={k.l} style={{flex:1,background:T.card,borderRadius:9,padding:"7px 3px",border:`1px solid ${T.border}`,textAlign:"center"}}>
            <div style={{fontSize:13,fontWeight:800,color:k.c,lineHeight:1}}>{k.v}</div>
            <div style={{fontSize:8,color:T.muted,marginTop:2}}>{k.l}</div>
          </div>
        ))}
      </div>

      {noData?(
        <div style={{textAlign:"center",padding:"40px 20px",color:T.muted}}>
          <div style={{fontSize:36,marginBottom:10}}>{dataMode==="full"?"📋":"⚡"}</div>
          <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:6}}>Sin datos {dataMode==="full"?"de registro completo":"de registro rápido"}</div>
          <div style={{fontSize:12,color:T.muted}}>
            {dataMode==="full"
              ? "Completá los detalles de los tiros rápidos o registrá en modo Completo."
              : "Registrá un partido en modo ⚡ Rápido para ver datos aquí."}
          </div>
        </div>
      ):(
        <>
          {/* Sub-tabs (solo modo completo tiene cancha y arco) */}
          <div style={{display:"flex",gap:5,marginBottom:12,flexWrap:"wrap"}}>
            {(dataMode==="full"
              ? [{k:"court",l:"🏟 Cancha"},{k:"goal",l:"🥅 Arco"},{k:"players",l:"👥 Jugadores"},{k:"analysis",l:"📐 Análisis"}]
              : [{k:"players",l:"👥 Jugadores"},{k:"analysis",l:"📐 Análisis"}]
            ).map(t=>(
              <button key={t.k} onClick={()=>setMainTab(t.k)}
                style={{flex:1,background:mainTab===t.k?T.accent:T.card,color:mainTab===t.k?"#fff":T.muted,
                  border:`1px solid ${mainTab===t.k?T.accent:T.border}`,borderRadius:9,padding:"8px 3px",fontSize:10,fontWeight:700,cursor:"pointer",minWidth:60}}>
                {t.l}
              </button>
            ))}
          </div>

          {mainTab==="court"&&dataMode==="full"&&<StatsCourt shots={shots}/>}

          {mainTab==="goal"&&dataMode==="full"&&(
            <div>
              <div style={{display:"flex",gap:6,marginBottom:10}}>
                {[{k:"goals",l:"⚽ Goles",c:T.green},{k:"saved",l:"🧤 Atajados",c:"#60a5fa"},{k:"miss",l:"❌ Errados",c:T.red},{k:"total",l:"📊 Total",c:T.yellow}].map(m=>(
                  <button key={m.k} onClick={()=>setGoalMode(m.k)}
                    style={{flex:1,background:goalMode===m.k?m.c+"28":T.card,color:goalMode===m.k?m.c:T.muted,
                      border:`1px solid ${goalMode===m.k?m.c:T.border}`,borderRadius:9,padding:"7px 2px",fontSize:10,fontWeight:700,cursor:"pointer"}}>{m.l}</button>
                ))}
              </div>
              <div style={{background:T.card,borderRadius:14,padding:"13px",border:`1px solid ${T.border}`,marginBottom:10}}>
                <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:11}}>🥅 Mapa del Arco — 9 Cuadrantes</div>
                <GoalMap byQ={byQ} mode={goalMode}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                {(()=>{
                  const best=[...byQ].reduce((a,b,i)=>b.goals>a.v?{v:b.goals,i}:a,{v:-1,i:0});
                  const worst=[...byQ].reduce((a,b,i)=>b.miss>a.v?{v:b.miss,i}:a,{v:-1,i:0});
                  return(<>
                    <div style={{background:T.card,borderRadius:12,padding:13,border:`1px solid ${T.green}33`}}>
                      <div style={{fontSize:10,color:T.green,letterSpacing:1,marginBottom:5}}>🏆 MÁS GOLES</div>
                      <div style={{fontSize:20,fontWeight:800,color:T.green}}>{best.v} goles</div>
                      <div style={{fontSize:12,color:T.muted}}>{QUADRANTS[best.i]?.label}</div>
                    </div>
                    <div style={{background:T.card,borderRadius:12,padding:13,border:`1px solid ${T.red}33`}}>
                      <div style={{fontSize:10,color:T.red,letterSpacing:1,marginBottom:5}}>⚠️ MÁS ERRADOS</div>
                      <div style={{fontSize:20,fontWeight:800,color:T.red}}>{worst.v} errados</div>
                      <div style={{fontSize:12,color:T.muted}}>{QUADRANTS[worst.i]?.label}</div>
                    </div>
                  </>);
                })()}
              </div>
            </div>
          )}

          {(mainTab==="players"||(dataMode==="quick"&&shots.length>0))&&(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {playerMap.length===0
                ?<div style={{textAlign:"center",padding:"20px",color:T.muted,fontSize:12}}>Sin datos de jugadores</div>
                :playerMap.map((p,i)=>{
                  const tot=p.goals+p.saved+p.miss,pct2=tot?Math.round(p.goals/tot*100):0;
                  return(
                    <div key={p.player} style={{background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"12px 13px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}>
                        <div style={{width:34,height:34,borderRadius:"50%",background:T.accent+"22",border:`2px solid ${T.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{fontSize:11,fontWeight:800,color:T.accent}}>#{p.number||"?"}</span>
                        </div>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",alignItems:"center",gap:5}}>
                            <span style={{fontSize:13,fontWeight:700,color:T.text}}>{p.player}</span>
                            {i<3&&<span style={{fontSize:13}}>{"🥇🥈🥉"[i]}</span>}
                          </div>
                          <div style={{fontSize:11,color:T.muted}}>{tot} tiros · {pct2}% conv.</div>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:5,marginBottom:6}}>
                        {[{l:"⚽",v:p.goals,c:T.green},{l:"🧤",v:p.saved,c:"#60a5fa"},{l:"❌",v:p.miss,c:T.red}].map(x=>(
                          <div key={x.l} style={{flex:1,textAlign:"center",borderRadius:8,padding:"6px 0",background:x.c+"12",border:`1px solid ${x.c}28`}}>
                            <div style={{fontSize:17,fontWeight:800,color:x.c}}>{x.v}</div>
                            <div style={{fontSize:9,color:T.muted}}>{x.l}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{height:4,borderRadius:2,display:"flex",overflow:"hidden",background:T.border}}>
                        <div style={{width:`${tot?p.goals/tot*100:0}%`,background:T.green}}/>
                        <div style={{width:`${tot?p.saved/tot*100:0}%`,background:"#60a5fa"}}/>
                        <div style={{width:`${tot?p.miss/tot*100:0}%`,background:T.red}}/>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          )}
          {mainTab==="analysis"&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {/* Distancia */}
              {shots.filter(s=>s.distance).length>0&&(
                <div style={{background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"13px 14px"}}>
                  <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:10}}>📏 Por Distancia</div>
                  {DISTANCES.map(d=>{
                    const ds=shots.filter(s=>s.distance===d.k);
                    if(!ds.length)return null;
                    const g=ds.filter(s=>s.result==="goal").length;
                    const pct=Math.round(g/ds.length*100);
                    return(
                      <div key={d.k} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                        <span style={{fontSize:12,width:16}}>{d.emoji}</span>
                        <span style={{fontSize:11,color:T.muted,width:70}}>{d.l}</span>
                        <div style={{flex:1,height:8,background:T.border,borderRadius:4,overflow:"hidden"}}>
                          <div style={{width:`${pct}%`,height:"100%",background:T.green,borderRadius:4}}/>
                        </div>
                        <span style={{fontSize:11,fontWeight:700,color:T.green,width:40,textAlign:"right"}}>{g}/{ds.length} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Situación */}
              {shots.filter(s=>s.situation).length>0&&(
                <div style={{background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"13px 14px"}}>
                  <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:10}}>⚖️ Por Situación</div>
                  {SITUATIONS.map(s=>{
                    const ss=shots.filter(sh=>sh.situation===s.k);
                    if(!ss.length)return null;
                    const g=ss.filter(sh=>sh.result==="goal").length;
                    const pct=Math.round(g/ss.length*100);
                    return(
                      <div key={s.k} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                        <span style={{fontSize:14,width:20}}>{s.emoji}</span>
                        <span style={{fontSize:11,color:T.muted,width:80}}>{s.l}</span>
                        <div style={{flex:1,height:8,background:T.border,borderRadius:4,overflow:"hidden"}}>
                          <div style={{width:`${pct}%`,height:"100%",background:s.color,borderRadius:4}}/>
                        </div>
                        <span style={{fontSize:11,fontWeight:700,color:s.color,width:40,textAlign:"right"}}>{g}/{ss.length} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Tipo de lanzamiento */}
              {shots.filter(s=>s.throwType).length>0&&(
                <div style={{background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"13px 14px"}}>
                  <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:10}}>🤾 Tipo de Lanzamiento</div>
                  {THROW_TYPES.map(t=>{
                    const ts=shots.filter(s=>s.throwType===t.k);
                    if(!ts.length)return null;
                    const g=ts.filter(s=>s.result==="goal").length;
                    const pct=Math.round(g/ts.length*100);
                    return(
                      <div key={t.k} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                        <span style={{fontSize:14,width:20}}>{t.emoji}</span>
                        <span style={{fontSize:11,color:T.muted,width:80}}>{t.l}</span>
                        <div style={{flex:1,height:8,background:T.border,borderRadius:4,overflow:"hidden"}}>
                          <div style={{width:`${pct}%`,height:"100%",background:T.yellow,borderRadius:4}}/>
                        </div>
                        <span style={{fontSize:11,fontWeight:700,color:T.yellow,width:40,textAlign:"right"}}>{g}/{ts.length} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {shots.filter(s=>s.distance||s.situation||s.throwType).length===0&&(
                <div style={{textAlign:"center",padding:"30px 20px",color:T.muted}}>
                  <div style={{fontSize:32,marginBottom:8}}>📐</div>
                  <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:4}}>Sin datos de análisis</div>
                  <div style={{fontSize:11}}>Registrá con Modo Completo para ver distancia, situación y tipo de lanzamiento.</div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
// ═══════════════════════════════════════════════════
const mapDbEvent = (e) => ({
  id:          e.id,
  min:         e.minute,
  team:        e.team,
  type:        e.type,
  zone:        e.zone,
  quadrant:    e.quadrant,
  attackSide:  e.attack_side,
  distance:    e.distance||null,
  situation:   e.situation||null,
  throwType:   e.throw_type||null,
  shooter:     e.shooter_name   ? { name: e.shooter_name,   number: e.shooter_number   } : null,
  goalkeeper:  e.goalkeeper_name? { name: e.goalkeeper_name, number: e.goalkeeper_number} : null,
  sanctioned:  e.sanctioned_name? { name: e.sanctioned_name, number: e.sanctioned_number} : null,
  hScore:      e.h_score,
  aScore:      e.a_score,
  completed:   e.completed,
  quickMode:   e.quick_mode,
});

const mapDbMatch = (m) => ({
  id:     m.id,
  home:   m.home_name,
  away:   m.away_name,
  hs:     m.home_score,
  as:     m.away_score,
  date:   m.match_date || '',
  hc:     m.home_color,
  ac:     m.away_color,
  events: (m.events || []).map(mapDbEvent).sort((a,b) => a.min - b.min),
});

// ═══════════════════════════════════════════════════
//  NAV + DEMO DATA
// ═══════════════════════════════════════════════════
const NAV=[
  {k:"matches",  icon:"🗓", label:"Partidos"},
  {k:"teams",    icon:"👥", label:"Equipos"},
  {k:"register", icon:"➕", label:"Registrar"},
  {k:"stats",    icon:"📊", label:"Stats"},
  {k:"ai",       icon:"🤖", label:"IA"},
];

const DEMO_MATCHES=[
  {id:"d1",home:"GEI",away:"Bernal",     hs:18,as:14,date:"01/06",hc:"#ef4444",ac:"#3b82f6",events:DEMO_EVENTS},
  {id:"d2",home:"Bernal",away:"GEI",     hs:19,as:25,date:"08/06",hc:"#3b82f6",ac:"#ef4444",events:[]},
  {id:"d3",home:"GEI",away:"Tigres FC",  hs:31,as:24,date:"15/06",hc:"#ef4444",ac:"#f59e0b",events:[]},
];

// ═══════════════════════════════════════════════════
//  MATCHES PAGE
// ═══════════════════════════════════════════════════
function MatchesPage({matchStatus,liveMatchInfo,liveScore,completedMatches,showNewMatch,setShowNewMatch,showCloseConfirm,setShowCloseConfirm,setTab,startMatch,setMatchStatus,closeMatch,setEvoMatch,setShowEvo,setStatsMatch,deleteMatch,reopenMatch}) {
  const [newForm,setNewForm]=useState({home:"GEI",away:"Bernal"});
  const myTeam="GEI";
  const seasonStats=useMemo(()=>{
    let w=0,d=0,l=0,gf=0,ga=0;
    completedMatches.forEach(m=>{
      const isHome=m.home===myTeam,isAway=m.away===myTeam;
      if(!isHome&&!isAway)return;
      const myG=isHome?m.hs:m.as, oppG=isHome?m.as:m.hs;
      gf+=myG;ga+=oppG;
      if(myG>oppG)w++;else if(myG===oppG)d++;else l++;
    });
    return{w,d,l,gf,ga,pts:w*2+d};
  },[completedMatches]);

  return(
    <div>
      <style>{`@keyframes blkRed{0%,100%{opacity:1}50%{opacity:.2}}`}</style>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:10,color:T.accent,letterSpacing:3,textTransform:"uppercase",marginBottom:4}}>Handball Pro v7</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:22,fontWeight:800,color:T.text}}>Partidos</div>
          {matchStatus==="idle"&&(
            <button onClick={()=>setShowNewMatch(true)}
              style={{background:`linear-gradient(135deg,${T.accent},${T.cyan})`,color:"#fff",border:"none",borderRadius:11,padding:"9px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
              + Nuevo
            </button>
          )}
        </div>
        <div style={{fontSize:12,color:T.muted}}>Temporada 2025</div>
      </div>

      <div style={{background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"12px 14px",marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:T.text,marginBottom:9}}>📊 {myTeam} — Temporada</div>
        <div style={{display:"flex",gap:6,marginBottom:9}}>
          {[{l:"PJ",v:seasonStats.w+seasonStats.d+seasonStats.l,c:T.text},{l:"G",v:seasonStats.w,c:T.green},{l:"E",v:seasonStats.d,c:T.yellow},{l:"P",v:seasonStats.l,c:T.red},{l:"GF",v:seasonStats.gf,c:T.text},{l:"GC",v:seasonStats.ga,c:T.muted},{l:"Pts",v:seasonStats.pts,c:T.accent}].map(k=>(
            <div key={k.l} style={{flex:1,textAlign:"center",background:T.card2,borderRadius:8,padding:"6px 2px",border:`1px solid ${T.border}`}}>
              <div style={{fontSize:13,fontWeight:800,color:k.c,lineHeight:1}}>{k.v}</div>
              <div style={{fontSize:8,color:T.muted,marginTop:2}}>{k.l}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:4}}>
          {[...completedMatches].slice(0,6).reverse().map((m,i)=>{
            const isHome=m.home===myTeam,isAway=m.away===myTeam;
            if(!isHome&&!isAway)return null;
            const myG=isHome?m.hs:m.as,oppG=isHome?m.as:m.hs;
            const res=myG>oppG?"W":myG===oppG?"D":"L";
            const col=res==="W"?T.green:res==="D"?T.yellow:T.red;
            return <div key={i} style={{width:28,height:28,borderRadius:"50%",background:col+"22",border:`2px solid ${col}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:10,fontWeight:800,color:col}}>{res}</span>
            </div>;
          })}
          <div style={{flex:1,display:"flex",alignItems:"center",paddingLeft:6}}>
            <span style={{fontSize:10,color:T.muted}}>Últimos {Math.min(6,completedMatches.length)} partidos</span>
          </div>
        </div>
      </div>

      {matchStatus==="live"&&(
        <div style={{background:"linear-gradient(135deg,#7f1d1d,#991b1b)",borderRadius:14,padding:"13px 16px",marginBottom:14,border:"1px solid #ef444444"}}>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:9}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:T.red,display:"inline-block",animation:"blkRed 1.2s infinite"}}/>
            <span style={{fontSize:11,color:T.red,fontWeight:700,letterSpacing:2}}>EN VIVO</span>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{textAlign:"center",flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:"#fff",marginBottom:2}}>{liveMatchInfo.home}</div>
              <div style={{fontSize:36,fontWeight:900,color:"#fff"}}>{liveScore.h}</div>
            </div>
            <div style={{color:"rgba(255,255,255,.4)",fontSize:14}}>VS</div>
            <div style={{textAlign:"center",flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:"#fff",marginBottom:2}}>{liveMatchInfo.away}</div>
              <div style={{fontSize:36,fontWeight:900,color:"#fff"}}>{liveScore.a}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setTab("register")} style={{flex:1,background:"rgba(239,68,68,.25)",border:"1px solid rgba(239,68,68,.5)",color:"#fca5a5",borderRadius:10,padding:"9px",fontWeight:700,fontSize:12,cursor:"pointer"}}>➕ Registrar</button>
            <button onClick={()=>setShowCloseConfirm(true)} style={{flex:1,background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.3)",color:"#fff",borderRadius:10,padding:"9px",fontWeight:700,fontSize:12,cursor:"pointer"}}>🏁 Cerrar</button>
          </div>
        </div>
      )}

      {matchStatus==="idle"&&(
        <div style={{background:T.card,borderRadius:14,border:`1px dashed ${T.border}`,padding:"16px",marginBottom:14,textAlign:"center"}}>
          <div style={{fontSize:22,marginBottom:6}}>🤾</div>
          <div style={{fontSize:13,fontWeight:700,color:T.muted,marginBottom:8}}>Sin partido en curso</div>
          <button onClick={()=>setShowNewMatch(true)}
            style={{background:`linear-gradient(135deg,${T.accent},${T.cyan})`,color:"#fff",border:"none",borderRadius:11,padding:"10px 20px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
            + Nuevo partido
          </button>
        </div>
      )}

      <div style={{fontSize:10,color:T.muted,letterSpacing:2,marginBottom:8,textTransform:"uppercase"}}>HISTORIAL</div>
      {completedMatches.map((m)=>{
        const isHome=m.home===myTeam,isAway=m.away===myTeam;
        const myG=isHome?m.hs:m.as,oppG=isHome?m.as:m.hs;
        const res=isHome||isAway?(myG>oppG?"W":myG===oppG?"D":"L"):null;
        const resCol=res==="W"?T.green:res==="D"?T.yellow:T.red;
        return(
          <div key={m.id} style={{background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"12px 14px",marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:11,color:T.muted}}>{m.date}</span>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {res&&<div style={{width:22,height:22,borderRadius:"50%",background:resCol+"22",border:`1.5px solid ${resCol}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:9,fontWeight:800,color:resCol}}>{res}</span>
                </div>}
                <Badge label="Final" color={T.green}/>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <div style={{flex:1,textAlign:"center"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,marginBottom:2}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:m.hc}}/>
                  <span style={{fontSize:12,fontWeight:700,color:T.text}}>{m.home}</span>
                </div>
                <div style={{fontSize:26,fontWeight:900,color:m.hs>m.as?T.text:T.muted}}>{m.hs}</div>
              </div>
              <div style={{color:T.muted,fontSize:13,fontWeight:700}}>–</div>
              <div style={{flex:1,textAlign:"center"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,marginBottom:2}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:m.ac}}/>
                  <span style={{fontSize:12,fontWeight:700,color:T.text}}>{m.away}</span>
                </div>
                <div style={{fontSize:26,fontWeight:900,color:m.as>m.hs?T.text:T.muted}}>{m.as}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:5,marginTop:2}}>
              <button onClick={()=>setStatsMatch&&setStatsMatch(m)}
                style={{flex:1,background:T.accent+"15",color:T.accent,border:`1px solid ${T.accent}33`,borderRadius:9,padding:"7px",fontSize:10,fontWeight:700,cursor:"pointer"}}>
                📊 Stats
              </button>
              <button onClick={()=>{setEvoMatch(m);setShowEvo(true);}}
                style={{flex:1,background:T.card2,color:T.muted,border:`1px solid ${T.border}`,borderRadius:9,padding:"7px",fontSize:10,fontWeight:600,cursor:"pointer"}}>
                📈 Evolución
              </button>
              <button onClick={()=>reopenMatch&&reopenMatch(m)}
                style={{flex:1,background:T.yellow+"15",color:T.yellow,border:`1px solid ${T.yellow}33`,borderRadius:9,padding:"7px",fontSize:10,fontWeight:600,cursor:"pointer"}}>
                ✏️ Reabrir
              </button>
              <button onClick={()=>{if(window.confirm(`¿Eliminar ${m.home} vs ${m.away}?`))deleteMatch&&deleteMatch(m.id);}}
                style={{background:T.red+"15",color:T.red,border:`1px solid ${T.red}33`,borderRadius:9,padding:"7px 9px",fontSize:12,cursor:"pointer"}}>
                🗑
              </button>
            </div>
          </div>
        );
      })}

      {showNewMatch&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",backdropFilter:"blur(6px)",display:"flex",flexDirection:"column",justifyContent:"flex-end",zIndex:300}}>
          <div style={{background:T.card,borderRadius:"22px 22px 0 0",padding:"18px 18px 24px",border:`1px solid ${T.border}`}}>
            <div style={{width:40,height:4,background:T.border,borderRadius:2,margin:"0 auto 16px"}}/>
            <div style={{fontSize:16,fontWeight:800,color:T.text,marginBottom:14}}>🤾 Nuevo Partido</div>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10,color:T.muted,letterSpacing:1,marginBottom:6}}>LOCAL</div>
              <input value={newForm.home} onChange={e=>setNewForm(f=>({...f,home:e.target.value}))}
                style={{width:"100%",background:T.card2,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px 14px",color:T.text,fontSize:14,fontWeight:700,boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,color:T.muted,letterSpacing:1,marginBottom:6}}>VISITANTE</div>
              <input value={newForm.away} onChange={e=>setNewForm(f=>({...f,away:e.target.value}))}
                style={{width:"100%",background:T.card2,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px 14px",color:T.text,fontSize:14,fontWeight:700,boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"flex",gap:9}}>
              <button onClick={()=>setShowNewMatch(false)} style={{flex:1,background:T.card2,color:T.muted,border:`1px solid ${T.border}`,borderRadius:12,padding:"13px",fontWeight:600,fontSize:14,cursor:"pointer"}}>Cancelar</button>
              <button onClick={()=>{
                startMatch(newForm.home, newForm.away);
              }} style={{flex:2,background:`linear-gradient(135deg,${T.accent},${T.cyan})`,color:"#fff",border:"none",borderRadius:12,padding:"13px",fontWeight:700,fontSize:14,cursor:"pointer"}}>
                ▶ Iniciar partido
              </button>
            </div>
          </div>
        </div>
      )}

      {showCloseConfirm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:20}}>
          <div style={{background:T.card,borderRadius:20,padding:22,border:`1px solid ${T.border}`,maxWidth:360,width:"100%",textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:10}}>🏁</div>
            <div style={{fontSize:16,fontWeight:800,color:T.text,marginBottom:6}}>¿Cerrar el partido?</div>
            <div style={{fontSize:13,color:T.muted,marginBottom:16}}>
              {liveMatchInfo.home} {liveScore.h} – {liveScore.a} {liveMatchInfo.away}
            </div>
            <div style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.3)",borderRadius:10,padding:"10px 12px",marginBottom:16,textAlign:"left"}}>
              <div style={{fontSize:11,color:T.yellow}}>💡 Podés completar los datos del registro rápido desde Stats → Registro rápido después de cerrar.</div>
            </div>
            <div style={{display:"flex",gap:9}}>
              <button onClick={()=>setShowCloseConfirm(false)} style={{flex:1,background:T.card2,color:T.muted,border:`1px solid ${T.border}`,borderRadius:12,padding:"13px",fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancelar</button>
              <button onClick={closeMatch} style={{flex:2,background:T.green,color:"#fff",border:"none",borderRadius:12,padding:"13px",fontWeight:700,fontSize:13,cursor:"pointer"}}>✓ Cerrar partido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  APP — con Supabase
// ═══════════════════════════════════════════════════
export default function App() {
  const [tab,setTab]                   = useState("matches");
  const [showEvo,setShowEvo]           = useState(false);
  const [evoMatch,setEvoMatch]         = useState(null);
  const [statsMatch,setStatsMatch]     = useState(null); // partido para ver stats
  const [liveEvents,setLiveEvents]     = useState([]);
  const [matchStatus,setMatchStatus]   = useState("idle");
  const [liveMatchInfo,setLiveMatchInfo] = useState({home:"GEI",away:"Bernal",date:null});
  const [liveMatchId,setLiveMatchId]   = useState(null); // Supabase UUID del partido en vivo
  const [completedMatches,setCompletedMatches] = useState([]);
  const [showNewMatch,setShowNewMatch] = useState(false);
  const [showCloseConfirm,setShowCloseConfirm] = useState(false);
  const [dbLoading,setDbLoading]       = useState(true);

  const liveScore = useMemo(()=>{
    const last = liveEvents.filter(e=>e.hScore!=null).slice(-1)[0];
    return last ? {h:last.hScore, a:last.aScore} : {h:0, a:0};
  },[liveEvents]);

  // ── CARGAR DATOS AL INICIAR ────────────────────
  useEffect(()=>{
    const load = async () => {
      try {
        // Partidos cerrados
        const { data: closed } = await supabase
          .from("matches").select("*")
          .eq("status","closed")
          .order("created_at",{ascending:false})
          .limit(30);
        if (closed?.length) setCompletedMatches(closed.map(mapDbMatch));

        // Partido en vivo (si quedó uno abierto)
        const { data: live } = await supabase
          .from("matches").select("*, events(*)")
          .eq("status","live")
          .order("created_at",{ascending:false})
          .limit(1)
          .maybeSingle();
        if (live) {
          setLiveMatchId(live.id);
          setLiveMatchInfo({home:live.home_name, away:live.away_name, date:null});
          setLiveEvents((live.events||[]).map(mapDbEvent).sort((a,b)=>a.min-b.min));
          setMatchStatus("live");
          setTab("register");
        }
      } catch(e){ console.warn("Supabase load error:",e); }
      finally { setDbLoading(false); }
    };
    load();
  },[]);

  // ── INICIAR PARTIDO ────────────────────────────
  const startMatch = useCallback(async (home, away) => {
    const hc = INIT_TEAMS.find(t=>t.name===home)?.color||"#ef4444";
    const ac = INIT_TEAMS.find(t=>t.name===away)?.color||"#3b82f6";
    try {
      const { data } = await supabase.from("matches").insert({
        home_name:home, away_name:away,
        home_color:hc, away_color:ac, status:"live"
      }).select().single();
      if (data) setLiveMatchId(data.id);
    } catch(e){ console.warn("insert match error:",e); }
    setLiveMatchInfo({home, away, date:null});
    setLiveEvents([]);
    setMatchStatus("live");
    setShowNewMatch(false);
    setTab("register");
  },[]);

  // ── GUARDAR EVENTO (llamado desde RegisterPage) ─
  const persistEvent = useCallback(async (ev) => {
    if (!liveMatchId) return ev.id;
    try {
      const { data } = await supabase.from("events").insert({
        match_id:         liveMatchId,
        minute:           ev.min,
        team:             ev.team,
        type:             ev.type,
        zone:             ev.zone,
        quadrant:         ev.quadrant,
        attack_side:      ev.attackSide||null,
        distance:         ev.distance||null,
        situation:        ev.situation||null,
        throw_type:       ev.throwType||null,
        shooter_name:     ev.shooter?.name||null,
        shooter_number:   ev.shooter?.number||null,
        goalkeeper_name:  ev.goalkeeper?.name||null,
        goalkeeper_number:ev.goalkeeper?.number||null,
        sanctioned_name:  ev.sanctioned?.name||null,
        sanctioned_number:ev.sanctioned?.number||null,
        h_score:          ev.hScore||0,
        a_score:          ev.aScore||0,
        completed:        ev.completed||false,
        quick_mode:       ev.quickMode||false,
      }).select().single();
      return data?.id || ev.id;
    } catch(e){ console.warn("insert event error:",e); return ev.id; }
  },[liveMatchId]);

  // ── COMPLETAR EVENTO (quick → detalles) ────────
  const updatePersistedEvent = useCallback(async (id, upd) => {
    try {
      await supabase.from("events").update({
        zone:             upd.zone,
        quadrant:         upd.quadrant,
        type:             upd.type,
        shooter_name:     upd.shooter?.name||null,
        shooter_number:   upd.shooter?.number||null,
        goalkeeper_name:  upd.goalkeeper?.name||null,
        goalkeeper_number:upd.goalkeeper?.number||null,
        completed:        true,
      }).eq("id", id);
    } catch(e){ console.warn("update event error:",e); }
  },[]);

  // ── CERRAR PARTIDO ─────────────────────────────
  const closeMatch = useCallback(async () => {
    const date = new Date().toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit"});
    if (liveMatchId) {
      try {
        await supabase.from("matches").update({
          home_score: liveScore.h,
          away_score: liveScore.a,
          status:     "closed",
          match_date: date,
        }).eq("id", liveMatchId);
      } catch(e){ console.warn("close match error:",e); }
    }
    const newMatch = {
      id:     liveMatchId||Date.now(),
      home:   liveMatchInfo.home,
      away:   liveMatchInfo.away,
      hs:     liveScore.h,
      as:     liveScore.a,
      date,
      hc:     INIT_TEAMS.find(t=>t.name===liveMatchInfo.home)?.color||T.accent,
      ac:     INIT_TEAMS.find(t=>t.name===liveMatchInfo.away)?.color||T.accent,
      events: [...liveEvents],
    };
    setCompletedMatches(prev=>[newMatch,...prev]);
    setLiveEvents([]);
    setLiveMatchId(null);
    setMatchStatus("idle");
    setShowCloseConfirm(false);
    setTab("matches");
  },[liveMatchId, liveMatchInfo, liveScore, liveEvents]);

  // ── ELIMINAR PARTIDO ──────────────────────────
  const deleteMatch = useCallback(async (id) => {
    try { await supabase.from("matches").delete().eq("id",id); } catch(e){}
    setCompletedMatches(prev=>prev.filter(m=>m.id!==id));
  },[]);

  // ── REABRIR PARTIDO RÁPIDO ────────────────────
  const reopenMatch = useCallback(async (m) => {
    // Marca como live de nuevo
    try { await supabase.from("matches").update({status:"live"}).eq("id",m.id); } catch(e){}
    setLiveMatchId(m.id);
    setLiveMatchInfo({home:m.home, away:m.away, date:null});
    setLiveEvents([...(m.events||[])]);
    setMatchStatus("live");
    setCompletedMatches(prev=>prev.filter(x=>x.id!==m.id));
    setTab("register");
  },[]);

  const content=()=>{
    if (dbLoading) return (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"60vh",gap:14}}>
        <div style={{width:36,height:36,borderRadius:"50%",border:`3px solid ${T.border}`,borderTop:`3px solid ${T.accent}`,animation:"spin 1s linear infinite"}}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{fontSize:13,color:T.muted}}>Cargando datos...</span>
      </div>
    );
    if(showEvo) return <EvolutionPage match={evoMatch} goBack={()=>{setShowEvo(false);setEvoMatch(null);}}/>;
    if(statsMatch) return <StatsPage
      liveEvents={[]}
      matchEvents={statsMatch.events||[]}
      matchTitle={`${statsMatch.home} ${statsMatch.hs} – ${statsMatch.as} ${statsMatch.away}`}
      onBack={()=>setStatsMatch(null)}
    />;
    switch(tab){
      case "matches": return <MatchesPage
        matchStatus={matchStatus} liveMatchInfo={liveMatchInfo} liveScore={liveScore}
        completedMatches={completedMatches}
        showNewMatch={showNewMatch} setShowNewMatch={setShowNewMatch}
        showCloseConfirm={showCloseConfirm} setShowCloseConfirm={setShowCloseConfirm}
        setTab={setTab} startMatch={startMatch}
        setMatchStatus={setMatchStatus} closeMatch={closeMatch}
        setEvoMatch={setEvoMatch} setShowEvo={setShowEvo}
        setStatsMatch={setStatsMatch}
        deleteMatch={deleteMatch}
        reopenMatch={reopenMatch}
      />;
      case "teams":    return <TeamsStub/>;
      case "register": return (
        <RegisterPage
          events={liveEvents} setEvents={setLiveEvents}
          matchStatus={matchStatus} setMatchStatus={setMatchStatus}
          matchInfo={liveMatchInfo}
          onCloseMatch={()=>setShowCloseConfirm(true)}
          onStartMatch={()=>setShowNewMatch(true)}
          persistEvent={persistEvent}
          updatePersistedEvent={updatePersistedEvent}
        />
      );
      case "stats":    return <StatsPage liveEvents={liveEvents}/>;
      case "ai":       return <AIStub/>;
      default:         return null;
    }
  };

  return (
    <div style={{background:T.bg,minHeight:"100vh",fontFamily:T.font,display:"flex",flexDirection:"column",alignItems:"center"}}>
      <div style={{width:"100%",maxWidth:430,minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",position:"relative"}}>
        <div style={{padding:"12px 18px 0",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:18}}>🤾</span>
            <span style={{fontSize:13,fontWeight:800,color:T.text,letterSpacing:1}}>HANDBALL PRO</span>
            <span style={{fontSize:9,background:T.accent+"22",color:T.accent,border:`1px solid ${T.accent}44`,borderRadius:8,padding:"1px 6px",fontWeight:700}}>v7</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <style>{`@keyframes blinkG{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
            {matchStatus==="live"
              ?<><div style={{width:6,height:6,borderRadius:"50%",background:T.red,animation:"blinkG 1.2s infinite"}}/>
                <span style={{fontSize:10,color:T.red,fontWeight:700}}>EN VIVO</span></>
              :<><div style={{width:6,height:6,borderRadius:"50%",background:T.muted}}/>
                <span style={{fontSize:10,color:T.muted,fontWeight:600}}>Sin partido</span></>
            }
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 16px 90px",WebkitOverflowScrolling:"touch"}}>
          {content()}
        </div>
        <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"rgba(6,12,24,.97)",backdropFilter:"blur(16px)",borderTop:`1px solid ${T.border}`,display:"flex",zIndex:50,paddingBottom:"env(safe-area-inset-bottom,0)"}}>
          {NAV.map(n=>{
            const active=!showEvo&&!statsMatch&&tab===n.k;
            return(
              <button key={n.k} onClick={()=>{setShowEvo(false);setEvoMatch(null);setStatsMatch(null);setTab(n.k);}}
                style={{flex:1,background:"transparent",border:"none",cursor:"pointer",padding:"10px 4px 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:3,position:"relative"}}>
                {active&&<div style={{position:"absolute",top:0,left:"20%",right:"20%",height:2,background:T.accent,borderRadius:"0 0 2px 2px"}}/>}
                {n.k==="register"&&matchStatus==="live"&&<div style={{position:"absolute",top:6,right:"18%",width:7,height:7,borderRadius:"50%",background:T.red}}/>}
                <span style={{fontSize:18,lineHeight:1,filter:active?"none":"grayscale(1) opacity(.42)",transform:active?"scale(1.15)":"scale(1)",transition:"all .15s"}}>{n.icon}</span>
                <span style={{fontSize:9,fontWeight:active?700:500,color:active?T.accent:T.muted,letterSpacing:.5}}>{n.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
