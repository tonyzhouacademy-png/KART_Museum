/* KART Museum: continuous river geography and a variable-speed cinematic route. */
window.createKARTWaterway = function(host,options){
  'use strict';
  const T=window.KARTThree,mobile=()=>host.clientWidth<761;
  const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});
  renderer.debug.onShaderError=(gl,p,v,f)=>{throw new Error(gl.getShaderInfoLog(f)||gl.getProgramInfoLog(p));};
  renderer.setPixelRatio(Math.min(devicePixelRatio,mobile()?1.35:1.6));renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.NoToneMapping;
  renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','淡彩建筑线描：沿河游历美术馆、钟楼与铁桥，远景缓行、近景加速');
  host.querySelector('.prologue-scene').append(renderer.domElement);
  const scene=new T.Scene();scene.background=new T.Color('#f4f3ef');scene.fog=new T.FogExp2('#f4f3ef',.0045);
  const camera=new T.PerspectiveCamera(48,1,.18,1000);
  let seed=2057;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const mat=color=>new T.MeshBasicMaterial({color,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
  const m={stone:mat('#eeede6'),trim:mat('#f7f5ee'),paving:mat('#e8ece6'),iron:mat('#718781'),roof:mat('#c8d7d6'),wood:mat('#b69483'),dark:mat('#8d9e99'),
    bronze:mat('#bc9582'),glass:new T.MeshBasicMaterial({color:'#dce8e1',transparent:true,opacity:.65,side:T.DoubleSide})};
  function surface(material,kind){
    material.onBeforeCompile=s=>{s.vertexShader='varying vec3 kp;varying vec3 kN;\n'+s.vertexShader;
      s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nkp=(modelMatrix*vec4(position,1.)).xyz;kN=normalize(mat3(modelMatrix)*normal);');
      s.fragmentShader='varying vec3 kp;varying vec3 kN;\n'+s.fragmentShader;
      const detail=`float shade=.5+.5*dot(normalize(kN),normalize(vec3(-1.,1.,.3)));float q=(kp.x+kp.y+kp.z)*1.8;float aa=max(fwidth(q),.01);float hatch=1.-smoothstep(.025,.025+aa,abs(fract(q)-.5));float fade=1.-smoothstep(.15,.6,aa);diffuseColor.rgb*=.94+.06*shade;diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*.79,hatch*fade*${kind==='roof'?'.5':'.16'});`;
      s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+detail);};material.customProgramCacheKey=()=>kind;
  }
  [m.stone,m.trim,m.paving].forEach(x=>surface(x,'stone'));surface(m.roof,'roof');surface(m.wood,'wood');
  // Draw architectural notation instead of sampling a photographic facade.
  const sheet=document.createElement('canvas');sheet.width=768;sheet.height=1024;
  const pen=sheet.getContext('2d');pen.fillStyle='#f4f2eb';pen.fillRect(0,0,768,1024);pen.strokeStyle='#7e8b82';pen.lineWidth=2;
  for(const y of [38,68,345,372,648,674,994]){pen.beginPath();pen.moveTo(0,y);pen.lineTo(768,y);pen.stroke();}
  for(let col=0;col<3;col++)for(let row=0;row<3;row++){
    const x=56+col*256,y=95+row*303,w=144,h=227;
    pen.fillStyle=['#e2e8dd','#e3e8e6','#eadbd0'][(col+row)%3];pen.fillRect(x,y+48,w,h-48);
    pen.beginPath();pen.moveTo(x,y+h);pen.lineTo(x,y+60);pen.bezierCurveTo(x,y-20,x+w,y-20,x+w,y+60);pen.lineTo(x+w,y+h);pen.closePath();pen.stroke();
    pen.strokeRect(x-8,y+62,w+16,h-56);pen.beginPath();pen.moveTo(x+w/2,y+8);pen.lineTo(x+w/2,y+h);pen.moveTo(x,y+135);pen.lineTo(x+w,y+135);pen.stroke();
    pen.globalAlpha=.22;for(let k=0;k<10;k++){pen.beginPath();pen.moveTo(x+k*14,y+h);pen.lineTo(x+k*14+12,y+h-58);pen.stroke();}pen.globalAlpha=1;
    for(const xx of [x-24,x+w+24]){pen.beginPath();pen.moveTo(xx,y-15);pen.lineTo(xx,y+h+12);pen.stroke();}
  }
  const texture=new T.CanvasTexture(sheet);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const facadeMaterial=new T.MeshBasicMaterial({map:texture,color:'#ffffff',polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
  const boxGeo=new T.BoxGeometry(1,1,1),rodGeo=new T.CylinderGeometry(1,1,1,8),planeGeo=new T.PlaneGeometry(1,1);
  function mesh(g,geo,material,pos=[0,0,0],scale=[1,1,1]){const o=new T.Mesh(geo,material);o.position.set(...pos);o.scale.set(...scale);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
  const box=(g,x,y,z,w,h,d,material)=>mesh(g,boxGeo,material,[x,y,z],[w,h,d]);
  function rod(g,a,b,r,material){const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);const o=mesh(g,rodGeo,material,start.add(end).multiplyScalar(.5).toArray(),[r,delta.length(),r]);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;}
  function tube(g,points,r,material){return mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),points.length*2,r,6,false),material);}
  function bake(g){
    g.updateMatrixWorld(true);const buckets=new Map();g.traverse(o=>{if(!o.isMesh)return;const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrixWorld);
      if(!geo.attributes.uv)geo.setAttribute('uv',new T.BufferAttribute(new Float32Array(geo.attributes.position.count*2),2));if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(geo);});g.clear();g.position.set(0,0,0);g.rotation.set(0,0,0);g.scale.set(1,1,1);
    for(const [material,geos] of buckets){const geo=new T.BufferGeometry();for(const [name,size] of [['position',3],['normal',3],['uv',2]]){const data=new Float32Array(geos.reduce((n,v)=>n+v.attributes[name].array.length,0));let offset=0;geos.forEach(v=>{data.set(v.attributes[name].array,offset);offset+=v.attributes[name].array.length;});geo.setAttribute(name,new T.BufferAttribute(data,size));}mesh(g,geo,material);geos.forEach(v=>v.dispose());}scene.add(g);return g;
  }
  function facade(g,x,y,z,w,h,rotation=-Math.PI/2,material=facadeMaterial){const o=mesh(g,planeGeo,material,[x,y,z],[w,h,1]);o.rotation.y=rotation;return o;}
  function hipRoof(g,x,y,z,w,d,h){
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([-w/2,0,-d/2,w/2,0,-d/2,w/2,0,d/2,-w/2,0,d/2,-w*.34,h,-d*.39,w*.34,h,-d*.39,w*.34,h,d*.39,-w*.34,h,d*.39],3));
    geo.setIndex([0,4,1,1,4,5,1,5,2,2,5,6,2,6,3,3,6,7,3,7,0,0,7,4,4,7,5,5,7,6]);geo.computeVertexNormals();mesh(g,geo,m.roof,[x,y,z]);
    for(const xx of [-1,1])rod(g,[x+xx*w*.34,y+h+.06,z-d*.39],[x+xx*w*.34,y+h+.06,z+d*.39],.07,m.bronze);
  }
  function clockTexture(){
    const c=document.createElement('canvas');c.width=c.height=768;const ctx=c.getContext('2d');ctx.translate(384,384);ctx.fillStyle='#f4f2eb';ctx.beginPath();ctx.arc(0,0,380,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#687c78';
    for(const r of [354,284,20]){ctx.lineWidth=r===20?8:3;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();}
    for(let i=0;i<60;i++){const a=i*Math.PI/30;ctx.lineWidth=i%5===0?5:2;ctx.beginPath();ctx.moveTo(Math.sin(a)*338,-Math.cos(a)*338);ctx.lineTo(Math.sin(a)*(i%5===0?318:329),-Math.cos(a)*(i%5===0?318:329));ctx.stroke();}
    ctx.fillStyle='#263d46';ctx.font='52px Times New Roman';ctx.textAlign='center';ctx.textBaseline='middle';['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'].forEach((n,i)=>{const a=i*Math.PI/6;ctx.fillText(n,Math.sin(a)*246,-Math.cos(a)*246);});
    for(const [a,l] of [[Math.PI/3,275],[-Math.PI/3,190]]){ctx.save();ctx.rotate(a);ctx.beginPath();ctx.moveTo(-9,30);ctx.lineTo(-6,-l+25);ctx.lineTo(0,-l);ctx.lineTo(6,-l+25);ctx.lineTo(9,30);ctx.closePath();ctx.fill();ctx.restore();}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;
  }
  const clockMaterial=new T.MeshBasicMaterial({map:clockTexture()}),architecture=new T.Group();
  box(architecture,35,11.5,-30,24,16,72,m.stone);
  for(let i=0;i<6;i++)facade(architecture,22.96,11.5,-60+i*12,12,16);
  for(let i=0;i<2;i++)facade(architecture,29+i*12,11.5,6.04,12,16,0);
  for(const [y,w,d] of [[3.7,24.7,72.7],[19.55,25.2,73.2],[19.9,24.7,72.7]])box(architecture,35,y,-30,w,.28,d,m.trim);
  hipRoof(architecture,35,20.05,-30,25,73,5.2);
  for(let z=-63;z<=4;z+=4.2){box(architecture,24.1,22.7,z,1.8,1.7,1.65,m.trim);box(architecture,23.16,22.7,z,.06,1.3,1.1,m.dark);box(architecture,23.09,22.7,z,.04,1.35,.05,m.bronze);box(architecture,23.09,22.7,z,.04,.05,1.12,m.bronze);hipRoof(architecture,24.05,23.65,z,2.1,2,.8);}
  for(const z of [-60,-30,0]){
    box(architecture,32.5,13.35,z,23,19.6,12,m.stone);facade(architecture,20.96,13.35,z,12,19.6);
    for(const zz of [z-6,z+6])box(architecture,20.77,13.3,zz,.42,19.8,.5,m.trim);
    box(architecture,32.5,23.35,z,24,.45,13,m.trim);hipRoof(architecture,32.5,23.6,z,24,13,6.5);
    for(const zz of [z-5,z+5]){box(architecture,32.5,30.3,zz,8,.22,.25,m.trim);mesh(architecture,new T.ConeGeometry(.28,1.7,12),m.trim,[32.5,31.1,zz]);}
    const ring=mesh(architecture,new T.TorusGeometry(3.18,.24,12,64),m.trim,[20.52,21.2,z]);ring.rotation.y=-Math.PI/2;
    const face=mesh(architecture,new T.CircleGeometry(2.98,64),clockMaterial,[20.49,21.2,z]);face.rotation.y=-Math.PI/2;
    for(let i=0;i<36;i++){const a=i*Math.PI/18;const block=box(architecture,20.6,21.2+Math.sin(a)*3.55,z+Math.cos(a)*3.55,.3,.36,.65,m.trim);block.rotation.x=-a-Math.PI/2;}
    for(const dz of [-3.9,3.9]){box(architecture,20.62,11.4,z+dz,.65,15.4,.65,m.trim);box(architecture,20.62,3.8,z+dz,.95,.3,.95,m.trim);box(architecture,20.54,19.25,z+dz,.8,.35,.95,m.trim);}
  }
  for(let z=-62;z<5;z+=7){box(architecture,44,25.2,z,.85,2.2,1.4,m.stone);box(architecture,44,26.4,z,1.1,.22,1.7,m.trim);}
  const hall=mesh(architecture,new T.CylinderGeometry(8,8,49,32,1,true,Math.PI/2,Math.PI),m.glass,[39,25.5,-30]);hall.rotation.x=Math.PI/2;
  for(let z=-54;z<=-6;z+=3)tube(architecture,Array.from({length:17},(_,i)=>{const a=i*Math.PI/16;return[39+Math.cos(a)*8.1,25.5+Math.sin(a)*8.1,z];}),.075,m.iron);
  bake(architecture);
  const riverCenter=z=>-(Math.max(0,-z-85)**2)*.001,shore=new T.Group();
  for(const sign of [-1,1]){
    const positions=[],indices=[];
    for(let i=0;i<=90;i++){const z=145-i*6;positions.push(riverCenter(z)+sign*18,3.42,z,sign*440,3.42,z);if(i<90){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(sign===1?indices:indices.map((v,i,a)=>i%3===1?a[i+1]:i%3===2?a[i-1]:v));geo.computeVertexNormals();m.paving.side=T.DoubleSide;mesh(shore,geo,m.paving);
    for(let z=-325;z<140;z+=5){const c=riverCenter(z+2.5),heading=Math.atan2(riverCenter(z+5)-riverCenter(z),5);
      for(const [offset,y,w,h,material] of [[15.3,.64,4.6,1.2,m.paving],[13.15,.6,.38,1.4,m.stone],[17.9,2,.45,2.85,m.stone],[17.9,3.5,.7,.15,m.trim]]){const o=box(shore,c+sign*offset,y,z+2.5,w,h,5.05,material);o.rotation.y=heading;}}
    for(let z=-80;z<45;z+=4){box(shore,sign*13.65,1.42,z,.22,.6,.22,m.iron);box(shore,sign*13.65,1.75,z,.35,.08,.35,m.iron);}
  }
  for(const [sign,z] of [[1,25],[-1,-14]])for(let i=0;i<15;i++)box(shore,sign*(13.8+i*.26),1.25+i*.15,z,.3,.24,5,m.trim);
  bake(shore);
  function bridge(z,scale=1){
    const g=new T.Group(),half=18,deck=x=>6.8-.6*(x/half)**2,arch=x=>1.5+4.7*(1-(x/half)**2);
    for(const side of [-1,1]){
      tube(g,Array.from({length:41},(_,i)=>{const x=-half+i*.9;return[x,arch(x),z+side*1.8];}),.18,m.iron);
      for(let i=0;i<24;i++){const x=-half+i*1.5,x2=x+1.5;rod(g,[x,arch(x),z+side*1.8],[x,deck(x),z+side*1.8],.07,m.iron);rod(g,[x,arch(x),z+side*1.8],[x2,deck(x2),z+side*1.8],.065,m.iron);rod(g,[x,deck(x),z+side*1.8],[x2,arch(x2),z+side*1.8],.05,m.iron);}
      tube(g,Array.from({length:41},(_,i)=>{const x=-half+i*.9;return[x,deck(x)+1.13,z+side*1.9];}),.045,m.iron);
      for(let x=-half;x<=half;x+=.45)rod(g,[x,deck(x)+.05,z+side*1.9],[x,deck(x)+1.1,z+side*1.9],.018,m.iron);
    }
    for(let x=-half;x<half;x+=.6){box(g,x+.3,deck(x),z,.62,.22,4,m.paving);rod(g,[x,arch(x),z-1.8],[x,arch(x),z+1.8],.07,m.iron);}
    for(const sign of [-1,1]){box(g,sign*19.2,4.8,z,2.5,2.8,4.5,m.stone);for(let i=0;i<16;i++)box(g,sign*(20.6+i*.36),6.2-i*.17,z,.39,.2,4,m.trim);}
    if(scale!==1){g.scale.setScalar(scale);g.position.z=z*(1-scale);}bake(g);
  }
  bridge(16);bridge(-109,.85);
  const city=new T.Group();
  for(const side of [-1,1])for(let i=0;i<9;i++){
    if((side===1&&i<4)||(side===-1&&i<2))continue;const z=2-i*20,x=side===-1?-34:38,h=10+random()*6,w=15,d=17;
    box(city,x,3.5+h/2,z,w,h,d,m.stone);const fm=facadeMaterial.clone();fm.color.set(i%3===0?'#f4eee9':i%3===1?'#f4f4ef':'#eaf2ee');
    facade(city,x-side*(w/2+.03),3.5+h/2,z,d,h,side===1?-Math.PI/2:Math.PI/2,fm);facade(city,x,3.5+h/2,z+d/2+.04,w,h,0,fm);
    box(city,x,3.5+h,z,w+.6,.3,d+.6,m.trim);hipRoof(city,x,3.7+h,z,w+.7,d+.7,3.5);
  }
  for(let i=0;i<8;i++){
    const x=67+(i%2)*19,z=4-i*19,h=11+random()*5;
    box(city,x,3.5+h/2,z,15,h,16,m.stone);
    facade(city,x-7.54,3.5+h/2,z,16,h);
    facade(city,x,3.5+h/2,z+8.04,15,h,0);
    box(city,x,3.5+h,z,15.6,.3,16.6,m.trim);hipRoof(city,x,3.7+h,z,15.7,16.7,3.6);
  }
  bake(city);
  // Cultural landmarks sit beyond the existing frontage and outside the camera corridor.
  const district=new T.Group(),copper=mat('#b3cbc3');
  const districtFacades=['#edf3ee','#f4ebe5','#e8eeee'].map(color=>{const material=facadeMaterial.clone();material.color.set(color);return material;});
  for(let row=0;row<3;row++)for(let i=0;i<12;i++){
    const x=137+row*35+(i%2)*3,z=-193+i*28,w=18+(i%3)*2,d=19,h=13+((i*7+row*3)%5)*2;
    const fm=districtFacades[(row+i)%3];
    box(district,x,3.5+h/2,z,w,h,d,m.stone);
    facade(district,x-w/2-.04,3.5+h/2,z,d,h,-Math.PI/2,fm);
    facade(district,x+w/2+.04,3.5+h/2,z,d,h,Math.PI/2,fm);
    facade(district,x,3.5+h/2,z+d/2+.04,w,h,0,fm);
    facade(district,x,3.5+h/2,z-d/2-.04,w,h,Math.PI,fm);
    box(district,x,3.6+h,z,w+.65,.3,d+.65,m.trim);hipRoof(district,x,3.8+h,z,w+.7,d+.7,3.1+(i%2));
    for(const dz of [-5,5])box(district,x+w*.28,7.2+h,z+dz,.75,1.8,1.2,m.stone);
  }
  // A portico library anchors the southern end of the crane-and-return shots.
  const library=new T.Group();library.position.x=-48;district.add(library);
  box(library,88,11.1,56,22,15.2,36,m.stone);
  for(const z of [44,56,68])facade(library,76.96,11.1,z,12,15.2);
  for(const x of [82.5,93.5]){facade(library,x,11.1,74.04,11,15.2,0);facade(library,x,11.1,37.96,11,15.2,Math.PI);}
  box(library,74.5,3.8,56,8,.6,39,m.trim);
  for(let i=0;i<7;i++){
    const z=38+i*6;
    mesh(library,new T.CylinderGeometry(.32,.44,10.2,16),m.trim,[73.5,9.1,z]);
    box(library,73.5,4.05,z,1.2,.3,1.2,m.trim);box(library,73.5,14.2,z,1.1,.3,1.1,m.trim);
    if(i<6){const arch=mesh(library,new T.TorusGeometry(2.7,.2,8,32,Math.PI),m.trim,[73.5,14.2,z+3]);arch.rotation.y=-Math.PI/2;}
  }
  box(library,75,17.35,56,6,.6,39,m.trim);box(library,88,18.8,56,23,.3,37,m.trim);hipRoof(library,88,18.95,56,23.5,37.5,3.5);
  const pediment=new T.Shape();pediment.moveTo(-9,0);pediment.lineTo(9,0);pediment.lineTo(0,4.1);pediment.closePath();
  const pedimentMesh=mesh(library,new T.ExtrudeGeometry(pediment,{depth:.5,bevelEnabled:false}),m.trim,[73.2,17.8,56]);pedimentMesh.rotation.y=-Math.PI/2;
  // A copper-domed rotunda gives the eastern skyline a different silhouette.
  const rx=108,rz=-5,bayTexture=texture.clone();bayTexture.repeat.set(1/3,1);bayTexture.needsUpdate=true;
  const rotundaFacade=facadeMaterial.clone();rotundaFacade.map=bayTexture;
  mesh(district,new T.CylinderGeometry(11,11,17,48),m.stone,[rx,12,rz]);
  for(let i=0;i<16;i++){
    const a=i*Math.PI/8,xx=rx+Math.cos(a)*11.08,zz=rz+Math.sin(a)*11.08;
    facade(district,xx,12,zz,4.35,16.5,Math.PI/2-a,rotundaFacade);
    mesh(district,new T.CylinderGeometry(.23,.3,13.2,12),m.trim,[rx+Math.cos(a+Math.PI/16)*11.5,11,rz+Math.sin(a+Math.PI/16)*11.5]);
    for(const y of [24,30])facade(district,rx+Math.cos(a)*10.05,y,rz+Math.sin(a)*10.05,1.5,2.8,Math.PI/2-a,m.dark);
  }
  for(const [y,r,h] of [[3.7,12.2,.5],[20.65,12,.6],[27.4,10.5,.3],[34.8,10.8,.4]])mesh(district,new T.CylinderGeometry(r,r,h,64),m.trim,[rx,y,rz]);
  mesh(district,new T.CylinderGeometry(10,10,14,48),m.stone,[rx,27.8,rz]);
  mesh(district,new T.SphereGeometry(11.1,48,24,0,Math.PI*2,0,Math.PI/2),copper,[rx,35,rz],[1,.66,1]);
  for(let i=0;i<16;i++){const a=i*Math.PI/8;tube(district,Array.from({length:13},(_,k)=>{const t=k*Math.PI/24;return[rx+Math.sin(t)*11.16*Math.cos(a),35+Math.cos(t)*7.38,rz+Math.sin(t)*11.16*Math.sin(a)];}),.045,m.bronze);}
  mesh(district,new T.CylinderGeometry(1.65,1.9,2.3,16),m.trim,[rx,43.25,rz]);mesh(district,new T.SphereGeometry(2.1,24,12,0,Math.PI*2,0,Math.PI/2),copper,[rx,44.4,rz],[1,.65,1]);
  mesh(district,new T.ConeGeometry(.18,1.6,12),m.bronze,[rx,46.3,rz]);
  const road=mat('#dce3dd'),garden=mat('#c8d5c5');
  box(district,124,3.44,-30,6,.025,267,road);
  for(const z of [27,100])box(district,150,3.44,z,131,.025,9,road);
  box(district,109,3.46,-27,22,.035,18,garden);
  for(const z of [-36.2,-17.8])box(district,109,3.55,z,23,.18,.4,m.trim);
  box(district,109,3.9,-27,3,.8,3,m.trim);mesh(district,new T.CylinderGeometry(.38,.5,4.8,16),m.trim,[109,6.7,-27]);
  mesh(district,new T.ConeGeometry(.7,1.3,8),m.bronze,[109,9.7,-27]);
  bake(district).name='cultural-district';
  function civicTower(x,z,scale){
    const g=new T.Group();g.position.set(x,3.5*(1-scale),z);g.scale.setScalar(scale);
    box(g,0,20.25,0,9,33.5,9,m.stone);
    for(const y of [10.7,24.7])for(let side=0;side<4;side++){
      const a=side*Math.PI/2;facade(g,Math.sin(a)*4.54,y,Math.cos(a)*4.54,9,14,a);
    }
    for(const y of [3.8,18,29,37.2])box(g,0,y,0,10,.4,10,m.trim);
    for(let side=0;side<4;side++){
      const a=side*Math.PI/2,clock=mesh(g,new T.CircleGeometry(1.7,40),clockMaterial,[Math.sin(a)*4.57,33.4,Math.cos(a)*4.57]);clock.rotation.y=a;
      const rim=mesh(g,new T.TorusGeometry(1.84,.12,8,40),m.trim,[Math.sin(a)*4.6,33.4,Math.cos(a)*4.6]);rim.rotation.y=a;
    }
    for(const xx of [-3.7,3.7])for(const zz of [-3.7,3.7])mesh(g,new T.CylinderGeometry(.3,.38,4.7,12),m.trim,[xx,39.7,zz]);
    mesh(g,new T.CylinderGeometry(.8,1.25,1.7,16),m.bronze,[0,39.4,0]);box(g,0,42.2,0,9.7,.4,9.7,m.trim);hipRoof(g,0,42.4,0,10,10,3.8);
    mesh(g,new T.ConeGeometry(.25,2,12),m.bronze,[0,47.1,0]);bake(g).name='civic-tower';
  }
  civicTower(70,114,.68);civicTower(28,-192,.83);
  const street=new T.Group(),lampMaterial=mat('#c4bd8b');
  for(const sign of [-1,1])for(let z=-76;z<37;z+=12){const x=sign*18.9;rod(street,[x,3.4,z],[x,7.8,z],.045,m.iron);mesh(street,new T.CylinderGeometry(.13,.22,.35,8),m.iron,[x,3.65,z]);mesh(street,new T.CylinderGeometry(.18,.11,.48,6),lampMaterial,[x,7.83,z]);mesh(street,new T.ConeGeometry(.26,.25,6),m.iron,[x,8.2,z]);}bake(street);
  const leafShape=new T.Shape();leafShape.moveTo(0,-.5);leafShape.quadraticCurveTo(.35,-.1,0,.5);leafShape.quadraticCurveTo(-.35,.05,0,-.5);
  const leafGeo=new T.ShapeGeometry(leafShape,3),leafColors=['#b6c9b8','#cbd5bd','#dec5b5','#bbd0c8'],leafTransforms=leafColors.map(()=>[]),trees=new T.Group(),dummy=new T.Object3D(),treeSites=[];
  for(const sign of [-1,1])for(const z of [-75,-53,-36,-12,6,35,60]){if(sign===-1&&z===35)continue;treeSites.push([sign*(sign===1?19.4:22),z,sign===1?11:9]);}
  for(let i=0;i<12;i++)treeSites.push([-48-random()*12,-110+random()*170,8+random()*5]);
  for(const [x,z,h] of treeSites){rod(trees,[x,3.4,z],[x+.18,3.4+h*.88,z],.13,m.wood);
    for(let i=0;i<10;i++){const a=i*2.4,yy=3.5+h*(.35+i*.05);rod(trees,[x,yy,z],[x+Math.cos(a)*1.1,yy+1.8,z+Math.sin(a)*1.1],.035,m.wood);}
    for(let i=0;i<160;i++){const yy=random(),a=random()*Math.PI*2,r=Math.sqrt(random())*(.5+Math.sin(yy*Math.PI)*1.1);dummy.position.set(x+Math.cos(a)*r,3.5+h*(.3+.7*yy),z+Math.sin(a)*r);dummy.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);dummy.scale.set(.65+random()*.45,.8+random()*.5,1);dummy.updateMatrix();leafTransforms[i%4].push(dummy.matrix.clone());}}
  bake(trees);leafTransforms.forEach((transforms,i)=>{const material=mat(leafColors[i]);material.side=T.DoubleSide;const leaves=new T.InstancedMesh(leafGeo,material,transforms.length);transforms.forEach((matrix,k)=>leaves.setMatrixAt(k,matrix));leaves.castShadow=true;leaves.receiveShadow=true;scene.add(leaves);});
  const boat=new T.Group(),hullShape=new T.Shape();hullShape.moveTo(0,-3.7);hullShape.bezierCurveTo(1.3,-2.8,1.4,1.8,.8,2.7);hullShape.quadraticCurveTo(0,3.1,-.8,2.7);hullShape.bezierCurveTo(-1.4,1.8,-1.3,-2.8,0,-3.7);
  const hull=mesh(boat,new T.ExtrudeGeometry(hullShape,{depth:.5,bevelEnabled:true,bevelSegments:3,bevelSize:.16,bevelThickness:.13}),m.wood,[0,.18,0]);hull.rotation.x=-Math.PI/2;
  box(boat,0,.74,0,2,.12,5.8,m.trim);box(boat,0,1.34,.5,1.7,1.1,2.8,m.glass);box(boat,0,1.94,.5,1.94,.13,3.1,m.trim);
  for(const x of [-.88,.88])for(const z of [-.9,.5,1.9])rod(boat,[x,.8,z],[x,1.9,z],.04,m.wood);for(const x of [-.9,.9])rod(boat,[x,.9,-2.6],[x,.9,2.5],.03,m.bronze);
  boat.traverse(o=>{o.castShadow=false;});scene.add(boat);
  const outlines=[],edgeCache=new Map(),ink=new T.LineBasicMaterial({color:'#698079',transparent:true,opacity:.52,depthWrite:false});
  scene.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh){if(!edgeCache.has(o.geometry))edgeCache.set(o.geometry,new T.EdgesGeometry(o.geometry,28));outlines.push([o,new T.LineSegments(edgeCache.get(o.geometry),ink)]);}});
  outlines.forEach(([o,line])=>o.add(line));
  const uniforms={time:{value:0},eye:{value:new T.Vector3()},boat:{value:new T.Vector2()}};
  const waterMaterial=new T.ShaderMaterial({uniforms,vertexShader:'varying vec3 world;void main(){vec4 p=modelMatrix*vec4(position,1.);world=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',
    fragmentShader:`uniform float time;uniform vec3 eye;uniform vec2 boat;varying vec3 world;
    void main(){vec2 p=world.xz;float q=p.y*1.8+sin(p.x*.7+time*.3)*.12;float aa=max(fwidth(q),.01);float stroke=(1.-smoothstep(.025,.025+aa,abs(fract(q)-.5)))*(1.-smoothstep(.15,.9,aa));stroke*=smoothstep(.05,.4,sin(p.x*.8+p.y*.25)*.5+.5);
      vec3 color=mix(vec3(.70,.80,.75),vec3(.36,.53,.49),stroke*.33);vec2 wake=p-boat;float trail=exp(-abs(abs(wake.x)-wake.y*.24)*9.)*smoothstep(1.,3.,wake.y)*(1.-smoothstep(6.,16.,wake.y));color=mix(color,vec3(.43,.59,.55),trail*.35);
      float fog=1.-exp(-pow(distance(eye,world)*.0045,2.));gl_FragColor=vec4(mix(color,vec3(.905,.896,.863),fog),1.);
      #include <colorspace_fragment>
    }`});
  const water=new T.Mesh(new T.PlaneGeometry(1600,1600),waterMaterial);water.rotation.x=-Math.PI/2;water.position.y=-.06;scene.add(water);
  const positions=[[-31,11,47],[-18,10,38],[-2,5,32],[-.5,3.8,10],[9,5,-12],[15.2,10,-27],[15.4,20,-37],[-6,37,-62],[-46,32,-7],[-31,11,47]];
  const targets=[[28,12,-28],[24,12,-27],[16,9,-23],[22,12,-29],[22,13,-30],[21,18,-30],[21,22,-30],[30,16,-30],[24,12,-29],[28,12,-28]];
  const times=[0,14,21,24,27,30,33,42,58,76],duration=76,path=new T.CatmullRomCurve3(positions.map(p=>new T.Vector3(...p)),false,'centripetal'),lookPath=new T.CatmullRomCurve3(targets.map(p=>new T.Vector3(...p)),false,'centripetal');
  // Monotone cubic time mapping preserves continuous motion across slow and fast sections.
  const step=1/(times.length-1),slopes=times.slice(1).map((t,i)=>step/(t-times[i])),tangents=times.map((_,i)=>i===0?slopes[0]:i===times.length-1?slopes.at(-1):2/(1/slopes[i-1]+1/slopes[i]));
  function journeyAt(seconds){if(seconds>=duration)return 1;let i=0;while(seconds>times[i+1])i++;const h=times[i+1]-times[i],v=(seconds-times[i])/h,v2=v*v,v3=v2*v;return(2*v3-3*v2+1)*i*step+(v3-2*v2+v)*h*tangents[i]+(-2*v3+3*v2)*(i+1)*step+(v3-v2)*h*tangents[i+1];}
  const target=new T.Vector3(),pointer=new T.Vector2(),smoothed=new T.Vector2(),title=host.querySelector('.prologue-title'),progress=host.querySelector('.prologue-progress'),scrub=host.querySelector('[data-prologue-seek]');scrub.max=String(duration);
  let elapsed=0,paused=options.paused,active=true,last=performance.now(),frames=0;
  const smooth=v=>{v=T.MathUtils.clamp(v,0,1);return v*v*(3-2*v);};
  function draw(){
    const u=T.MathUtils.clamp(journeyAt(Math.max(0,Math.min(elapsed,duration))),0,1);camera.position.copy(path.getPoint(u));target.copy(lookPath.getPoint(u));smoothed.lerp(pointer,.025);camera.position.x+=smoothed.x*.2;camera.position.y+=smoothed.y*.08;
    if(mobile())camera.position.add(camera.position.clone().sub(target).multiplyScalar(.18));camera.fov=(mobile()?65:48)+5*smooth((elapsed-17)/5)*(1-smooth((elapsed-35)/8));camera.updateProjectionMatrix();camera.lookAt(target);camera.updateMatrixWorld();
    const z=24-elapsed*.85,x=riverCenter(z)-2.8+Math.sin(elapsed*.025)*.9;
    const heading=Math.PI+Math.atan(.002*Math.max(0,-z-85)-.9*.025*Math.cos(elapsed*.025)/.85);
    boat.position.set(x,.02+Math.sin(elapsed)*.035,z);boat.rotation.set(Math.sin(elapsed*.7)*.008,heading,Math.sin(elapsed*.8)*.009);uniforms.time.value=elapsed;uniforms.eye.value.copy(camera.position);uniforms.boat.value.set(x,z);
    renderer.render(scene,camera);
    progress.style.transform=`scaleX(${Math.min(elapsed/duration,1)})`;title.style.opacity=String(Math.min(1,1-smooth((elapsed-5)/4)+smooth((elapsed-68)/6)));if(document.activeElement!==scrub)scrub.value=String(Math.min(elapsed,duration));
    host.dataset.frames=String(++frames);host.dataset.elapsed=elapsed.toFixed(2);host.dataset.camera=camera.position.toArray().map(v=>v.toFixed(2)).join(',');host.dataset.journey=u.toFixed(5);
  }
  function tick(now){const dt=Math.max(0,Math.min((now-last)/1000,.1));last=now;if(!active||paused)return;elapsed=Math.min(duration,elapsed+dt);draw();if(elapsed>=duration){active=false;renderer.setAnimationLoop(null);options.onComplete?.();}}
  function resize(){if(!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;draw();}
  new ResizeObserver(resize).observe(host);host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width-.5,(e.clientY-r.top)/r.height-.5);});host.addEventListener('pointerleave',()=>pointer.set(0,0));
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();active=false;renderer.setAnimationLoop(null);host.dataset.ready='false';host.dataset.fallback='true';host.querySelectorAll('.prologue-icon,input').forEach(b=>b.disabled=true);});resize();renderer.setAnimationLoop(tick);
  return {setPaused(value){paused=value;if(paused)draw();},setActive(value){active=value;renderer.setAnimationLoop(active?tick:null);last=performance.now();if(active)draw();},replay(){elapsed=0;paused=false;active=true;last=performance.now();draw();renderer.setAnimationLoop(tick);},seek(seconds){elapsed=T.MathUtils.clamp(seconds,0,duration);draw();}};
};
