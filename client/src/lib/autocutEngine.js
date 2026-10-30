// Browser-only VibePulse AutoCut preset engine. Advanced AI scene/face analysis is not simulated.
export const AUTO_STYLES = {
 smart:{label:'Smart Auto',pacing:2.2,motion:['slowZoomIn','slowZoomOut','kenBurns','panLeft','panRight'],transitions:['fade','dissolve','zoom','slide'],filters:['cinematic','natural','warm'],effects:['none','vignette','grain']},
 tiktok:{label:'TikTok Trending',pacing:1.15,motion:['fastZoom','bounce','shake','zoomPulse'],transitions:['flash','zoom','swipe','glitch'],filters:['vivid','neon','highContrast'],effects:['none','rgb','glitch']},
 cinematic:{label:'Cinematic',pacing:3.1,motion:['slowZoomIn','slowZoomOut','kenBurns','panLeft','panRight'],transitions:['dissolve','fade','lightLeak','zoom'],filters:['cinematic','tealOrange','moody'],effects:['vignette','grain','glow']},
 romantic:{label:'Romantic',pacing:2.7,motion:['slowZoomIn','kenBurns','panRight'],transitions:['fade','dissolve','blur'],filters:['romantic','warm','dreamy'],effects:['glow','bokeh','none']},
 sad:{label:'Sad / Emotional',pacing:3.4,motion:['slowZoomOut','panLeft','slowZoomIn'],transitions:['fade','dissolve','blur'],filters:['moody','cool','monochrome'],effects:['vignette','grain','none']},
 birthday:{label:'Birthday',pacing:1.7,motion:['bounce','zoomPulse','popUp','fastZoom'],transitions:['flash','spin','zoom','wipe'],filters:['vivid','warm','golden'],effects:['sparkle','glow','none']},
 travel:{label:'Travel Cinematic',pacing:2.1,motion:['kenBurns','panLeft','panRight','slowZoomIn'],transitions:['swipe','slide','zoom','dissolve'],filters:['natural','golden','tealOrange'],effects:['lightLeak','vignette','none']},
 gaming:{label:'Gaming Montage',pacing:.95,motion:['shake','fastZoom','spin','zoomPulse'],transitions:['glitch','flash','rgb','shake'],filters:['highContrast','neon','vivid'],effects:['glitch','rgb','none']},
 documentary:{label:'Documentary',pacing:3.8,motion:['kenBurns','slowZoomIn','slowZoomOut','panLeft'],transitions:['dissolve','fade','wipe'],filters:['natural','documentary','moody'],effects:['grain','vignette','none']},
 news:{label:'News Intro',pacing:1.5,motion:['fastZoom','panLeft','panRight','zoomPulse'],transitions:['push','flash','wipe','slide'],filters:['highContrast','cool','documentary'],effects:['none','glitch','vignette']},
 beat:{label:'Music Beat Edit',pacing:1,motion:['zoomPulse','fastZoom','shake','slowZoomIn'],transitions:['flash','zoom','shake','rgb'],filters:['vivid','highContrast','cinematic'],effects:['none','rgb','glitch']},
 memories:{label:'Memories',pacing:2.8,motion:['slowZoomIn','slowZoomOut','kenBurns','panRight'],transitions:['fade','dissolve','lightLeak'],filters:['warm','romantic','vintage'],effects:['grain','lightLeak','none']}
};
export const FILTER_PRESETS = {
 natural:{label:'Natural',css:'none'},cinematic:{label:'Cinematic',css:'contrast(1.12) saturate(.9) sepia(.08)'},tealOrange:{label:'Teal & Orange',css:'contrast(1.16) saturate(1.16) sepia(.08) hue-rotate(-8deg)'},
 moody:{label:'Moody Dark',css:'contrast(1.24) brightness(.82) saturate(.82)'},vintage:{label:'Vintage Film',css:'sepia(.28) contrast(1.08) saturate(.84)'},retro:{label:'Retro 90s',css:'sepia(.14) saturate(1.22) contrast(1.08)'},
 warm:{label:'Warm',css:'sepia(.16) saturate(1.12) brightness(1.04)'},cool:{label:'Cool',css:'saturate(.92) hue-rotate(12deg) contrast(1.06)'},golden:{label:'Golden Hour',css:'sepia(.2) saturate(1.22) brightness(1.05)'},
 romantic:{label:'Romantic Soft',css:'brightness(1.06) saturate(1.05) sepia(.08)'},dreamy:{label:'Dreamy Pastel',css:'brightness(1.1) saturate(.78) contrast(.94)'},monochrome:{label:'Black & White',css:'grayscale(1) contrast(1.12)'},
 highContrast:{label:'High Contrast',css:'contrast(1.3) saturate(1.18)'},vivid:{label:'Vivid HDR-style',css:'contrast(1.16) saturate(1.38)'},luxury:{label:'Luxury Gold',css:'sepia(.18) contrast(1.16) saturate(1.1)'},
 neon:{label:'Neon Night',css:'saturate(1.55) contrast(1.18) hue-rotate(-8deg)'},documentary:{label:'Documentary',css:'contrast(1.08) saturate(.86)'}
};
export const MOTION_OPTIONS=[['None','none'],['Slow Zoom In','slowZoomIn'],['Slow Zoom Out','slowZoomOut'],['Fast Zoom','fastZoom'],['Zoom Pulse','zoomPulse'],['Ken Burns','kenBurns'],['Pan Left','panLeft'],['Pan Right','panRight'],['Tilt Up','tiltUp'],['Tilt Down','tiltDown'],['Camera Shake','shake'],['Bounce','bounce'],['Swing','swing'],['Spin','spin'],['Rotate','rotate'],['Flip','flip'],['Pop Up','popUp'],['Slide Left','slideLeft'],['Slide Right','slideRight'],['Slide Up','slideUp'],['Slide Down','slideDown'],['Blur Reveal','blurReveal'],['Glitch','glitch'],['Elastic','elastic'],['Parallax Motion','parallax']];
export const TRANSITION_OPTIONS=[['Cut','cut'],['Smooth Fade','fade'],['Cross Dissolve','dissolve'],['Zoom','zoom'],['Spin','spin'],['Flash','flash'],['White Flash','whiteFlash'],['Black Flash','blackFlash'],['Blur','blur'],['Glitch','glitch'],['Swipe','swipe'],['Slide','slide'],['Push','push'],['Wipe','wipe'],['RGB Split','rgb'],['Shake','shake'],['Light Leak','lightLeak'],['Film Burn','filmBurn']];
export const VFX_OPTIONS=[['None','none'],['Cinematic Glow','glow'],['Neon Glow','neon'],['Film Grain','grain'],['VHS','vhs'],['Vignette','vignette'],['Digital Glitch','glitch'],['RGB Split','rgb'],['Chromatic Aberration','chromatic'],['Light Leak','lightLeak'],['Film Burn','filmBurn'],['Sparkles','sparkle'],['Bokeh','bokeh'],['Dust & Scratches','dust'],['Rain Overlay','rain'],['Snow Overlay','snow'],['Fog','fog'],['Pixel Distortion','pixelate']];
export function createAutoCutPlan(clips,styleId='smart',beatTimes=[],useBeatSync=false){
 const style=AUTO_STYLES[styleId]||AUTO_STYLES.smart;
 return clips.map((clip,index)=>{let duration=clip.type==='video'?Math.min(5,Math.max(1.2,style.pacing*1.6)):style.pacing;
  if(useBeatSync&&beatTimes.length>index+1){const gap=beatTimes[index+1]-beatTimes[index];if(gap>=.65&&gap<=4.5)duration=gap;}
  const pick=(items,offset=0)=>items[(index+offset)%items.length],filterKey=pick(style.filters),effect=pick(style.effects);
  return {...clip,duration:Number(duration.toFixed(2)),motion:pick(style.motion,index%3===0?0:1),transition:index===0?'fade':pick(style.transitions,index%2),filter:FILTER_PRESETS[filterKey]?.css||'none',filterKey,effect,effectIntensity:effect==='none'?0:.35+(index%3)*.15};
 });
}
export function buildColorFilter(base='none',controls={}){const b=Math.max(.35,Math.min(1.8,1+(Number(controls.exposure||0)+Number(controls.brightness||0))/100)),c=Math.max(.35,Math.min(1.9,1+Number(controls.contrast||0)/100)),s=Math.max(0,Math.min(2.2,1+Number(controls.saturation||0)/100)),t=Math.max(-30,Math.min(30,Number(controls.temperature||0))),tint=Math.max(-30,Math.min(30,Number(controls.tint||0)));return [base==='none'?'':base,'brightness('+b.toFixed(2)+')','contrast('+c.toFixed(2)+')','saturate('+s.toFixed(2)+')',t?'sepia('+Math.abs(t/100).toFixed(2)+')':'',tint?'hue-rotate('+tint+'deg)':''].filter(Boolean).join(' ')||'none';}
