/* Nazeef GP: lightweight procedural WebGL motorcycle racing scene. */
(()=>{'use strict';
let T,renderer,scene,camera,track,player,rivals=[],ready=false,container,fallback;
const mats={};
function mat(color,roughness=.7,metalness=0){return new T.MeshStandardMaterial({color,roughness,metalness})}
function addBox(parent,w,h,d,material,x,y,z,ry=0){const m=new T.Mesh(new T.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.rotation.y=ry;parent.add(m);return m}
function tube(parent,a,b,r,material){const av=new T.Vector3(...a),bv=new T.Vector3(...b),delta=bv.clone().sub(av),m=new T.Mesh(new T.CylinderGeometry(r,r,delta.length(),8),material);m.position.copy(av.add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());parent.add(m);return m}
function makeBike(color,isPlayer=false){
 const g=new T.Group(),body=mat(color,.34,.22),dark=mat('#151d26',.65),rubber=mat('#080b0e',.94),steel=mat('#a7b5be',.32,.8),chrome=mat('#d4dce0',.24,.82),visor=mat('#10283a',.2,.5),accent=isPlayer?mat('#ffcf48',.4,.2):chrome;
 function wheel(z){const w=new T.Group(),tire=new T.Mesh(new T.TorusGeometry(.48,.16,9,22),rubber);tire.rotation.y=Math.PI/2;w.add(tire);const rim=new T.Mesh(new T.TorusGeometry(.29,.045,7,18),chrome);rim.rotation.y=Math.PI/2;w.add(rim);const hub=new T.Mesh(new T.CylinderGeometry(.09,.09,.28,10),steel);hub.rotation.z=Math.PI/2;w.add(hub);const disc=new T.Mesh(new T.CylinderGeometry(.22,.22,.025,14),steel);disc.rotation.z=Math.PI/2;disc.position.x=.15;w.add(disc);w.position.set(0,.52,z);g.add(w)}
 wheel(-1.25);wheel(1.15);
 tube(g,[-.34,.58,1.1],[0,1.1,-.25],.085,steel);tube(g,[.34,.58,1.1],[0,1.1,-.25],.085,steel);tube(g,[0,.7,-.55],[0,.58,1.1],.07,dark);tube(g,[-.24,.58,1.1],[0,.78,-.65],.055,chrome);tube(g,[.24,.58,1.1],[0,.78,-.65],.055,chrome);
 const engine=new T.Mesh(new T.BoxGeometry(.62,.55,.75),dark);engine.position.set(0,.78,.18);g.add(engine);
 const tank=new T.Mesh(new T.SphereGeometry(1,16,12),body);tank.scale.set(.47,.36,.72);tank.position.set(0,1.24,-.12);g.add(tank);
 const fairing=new T.Mesh(new T.SphereGeometry(1,18,12),body);fairing.scale.set(.48,.58,.68);fairing.position.set(0,1.1,-.84);g.add(fairing);
 const nose=new T.Mesh(new T.ConeGeometry(.38,.72,14),body);nose.rotation.x=-Math.PI/2;nose.position.set(0,1.1,-1.4);g.add(nose);
 addBox(g,.58,.15,.8,dark,0,1.15,.63);
 const lamp=new T.Mesh(new T.SphereGeometry(.15,10,8),mat('#fff1c6',.2));lamp.scale.set(1,.5,.35);lamp.position.set(0,1.27,-1.48);g.add(lamp);
 tube(g,[-.48,1.2,-.9],[-.68,1.38,-1.4],.04,chrome);tube(g,[.48,1.2,-.9],[.68,1.38,-1.4],.04,chrome);
 const exhaust=new T.Mesh(new T.CylinderGeometry(.08,.13,.9,9),chrome);exhaust.rotation.x=Math.PI/2;exhaust.position.set(.38,.66,.75);g.add(exhaust);
 // Tucked rider, race leathers, arms, legs and full-face helmet.
 const torso=new T.Mesh(new T.SphereGeometry(1,14,10),dark);torso.scale.set(.38,.5,.57);torso.position.set(0,1.72,.23);torso.rotation.x=-.55;g.add(torso);
 addBox(g,.44,.12,.42,accent,0,1.91,.48);
 tube(g,[-.27,1.78,-.02],[-.56,1.35,-.9],.1,dark);tube(g,[.27,1.78,-.02],[.56,1.35,-.9],.1,dark);
 tube(g,[-.56,1.35,-.9],[-.64,1.3,-1.18],.08,steel);tube(g,[.56,1.35,-.9],[.64,1.3,-1.18],.08,steel);
 tube(g,[-.2,1.5,.4],[-.3,.8,-.2],.12,dark);tube(g,[.2,1.5,.4],[.3,.8,-.2],.12,dark);
 const helmet=new T.Mesh(new T.SphereGeometry(.34,16,12),accent);helmet.scale.set(1,1.1,1);helmet.position.set(0,2.22,-.12);g.add(helmet);
 const shield=new T.Mesh(new T.SphereGeometry(.24,12,8),visor);shield.scale.set(1,.55,.38);shield.position.set(0,2.22,-.39);g.add(shield);
 return g;
}
async function init(host,oldCanvas){
 container=host;fallback=oldCanvas;
 T=await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');
 scene=new T.Scene();scene.background=new T.Color('#a9d1e2');scene.fog=new T.FogExp2('#a9d1e2',.0022);
 camera=new T.PerspectiveCamera(66,host.clientWidth/host.clientHeight,.1,1100);
 renderer=new T.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(host.clientWidth,host.clientHeight,false);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=false;
 const cv=renderer.domElement;cv.id='world3d';cv.setAttribute('aria-label','Real-time 3D motorcycle racing');cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:1;display:block;touch-action:none';host.insertBefore(cv,host.firstChild);oldCanvas.style.display='none';
 scene.add(new T.HemisphereLight(0xe9f6ff,0x4b5139,2.1));
 const sun=new T.DirectionalLight(0xffe4c2,2.6);sun.position.set(-65,110,45);scene.add(sun);
 const fill=new T.DirectionalLight(0x9bc6ff,.75);fill.position.set(55,40,-80);scene.add(fill);
 const asphalt=mat('#343b42',.94),grass=mat('#527b49'),red=mat('#d34b4c'),ivory=mat('#ecebe2'),steel=mat('#aebbc1',.45,.45),dark=mat('#293540'),foliage=mat('#326b47'),bark=mat('#62462f'),stand=mat('#465563');
 track=new T.CatmullRomCurve3([[-48,0,115],[-112,0,70],[-118,0,-35],[-62,0,-112],[45,0,-118],[118,0,-60],[112,0,50],[50,0,118]].map(p=>new T.Vector3(...p)),true,'catmullrom',.42);
 // Build a continuous 3D ribbon road around the full race circuit.
 const N=400,width=15,vertices=[],indices=[],left=[],right=[];
 for(let i=0;i<=N;i++){const p=track.getPointAt(i/N),tan=track.getTangentAt(i/N).normalize(),side=new T.Vector3(tan.z,0,-tan.x).normalize(),l=p.clone().addScaledVector(side,-width/2),r=p.clone().addScaledVector(side,width/2);left.push(l);right.push(r);vertices.push(l.x,.025,l.z,r.x,.025,r.z);if(i<N){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2)}}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();scene.add(new T.Mesh(geo,asphalt));
 const field=new T.Mesh(new T.PlaneGeometry(1200,1200),grass);field.rotation.x=-Math.PI/2;field.position.y=-.2;scene.add(field);
 for(let i=0;i<N;i+=2){for(const [edge,m] of [[left,Math.floor(i/3)%2?red:ivory],[right,Math.floor(i/3)%2?ivory:red]]){const a=edge[i],b=edge[i+2],mid=a.clone().add(b).multiplyScalar(.5),mesh=new T.Mesh(new T.BoxGeometry(.7,.12,a.distanceTo(b)),m);mesh.position.set(mid.x,.1,mid.z);mesh.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);scene.add(mesh)}}
 for(let i=0;i<100;i++){const p=track.getPointAt(i/100),tan=track.getTangentAt(i/100),mark=new T.Mesh(new T.BoxGeometry(.13,.025,1.7),ivory);mark.position.set(p.x,.06,p.z);mark.rotation.y=Math.atan2(tan.x,tan.z);scene.add(mark)}
 for(let i=0;i<64;i++){const p=track.getPointAt(i/64),tan=track.getTangentAt(i/64),side=new T.Vector3(tan.z,0,-tan.x);for(const s of [-1,1]){const x=p.x+side.x*s*(19+(i%3)*2),z=p.z+side.z*s*(19+(i%3)*2);if(i%3===0){const trunk=new T.Mesh(new T.CylinderGeometry(.2,.32,2.8,6),bark);trunk.position.set(x,1.4,z);scene.add(trunk);const crown=new T.Mesh(new T.ConeGeometry(1.9,4.5,7),foliage);crown.position.set(x,4.7,z);scene.add(crown)}else if(i%4===0){addBox(scene,7,1.7,2,stand,x,1.8,z,Math.atan2(tan.x,tan.z));for(let n=0;n<4;n++)addBox(scene,1.1,.4,.2,[red,ivory,mat('#e6bd43'),mat('#3c9eb8')][n],x-2.2+n*1.45,2.85,z,Math.atan2(tan.x,tan.z))}else addBox(scene,.14,2,.14,steel,x,1,z)}}
 addBox(scene,1,8,1,steel,-7,4,110);addBox(scene,1,8,1,steel,7,4,110);addBox(scene,16,.65,1,dark,0,7.5,110);addBox(scene,15,.9,.12,mat('#e7b83d'),0,7.5,109.4);
 player=makeBike('#ffb72d',true);scene.add(player);rivals=[makeBike('#259ac6'),makeBike('#cf414b'),makeBike('#8b64c7')];rivals.forEach(b=>scene.add(b));
 ready=true;resize();return true;
}
function resize(){if(!renderer||!container)return;renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(container.clientWidth,container.clientHeight,false);camera.aspect=container.clientWidth/container.clientHeight;camera.updateProjectionMatrix()}
function render(s){
 if(!ready)return;const t=((s.progress%240)+240)%240/240,p=track.getPointAt(t),tan=track.getTangentAt(t).normalize(),side=new T.Vector3(tan.z,0,-tan.x);
 player.position.set(p.x+side.x*s.playerX*5.4,.02,p.z+side.z*s.playerX*5.4);player.rotation.y=Math.atan2(-tan.x,-tan.z);player.rotation.z=-s.lean*.4;
 s.opponents.forEach((o,i)=>{const u=((o.p%240)+240)%240/240,op=track.getPointAt(u),ot=track.getTangentAt(u).normalize(),os=new T.Vector3(ot.z,0,-ot.x);rivals[i].position.set(op.x+os.x*o.x*4.3,.02,op.z+os.z*o.x*4.3);rivals[i].rotation.y=Math.atan2(-ot.x,-ot.z)});
 const desired=new T.Vector3(p.x-tan.x*10,5.0,p.z-tan.z*10);camera.position.lerp(desired,.14);const aim=p.clone().addScaledVector(tan,8);aim.y=1.5;camera.lookAt(aim);camera.fov=66+Math.min(5,s.speed*.018);camera.updateProjectionMatrix();renderer.render(scene,camera);
}
window.Nazeef3D={init,render,resize,get ready(){return ready}};
})();