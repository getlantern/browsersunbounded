"use strict";(self.webpackChunkbroflake_ui=self.webpackChunkbroflake_ui||[]).push([[502],{3502:function(t,n,e){e.r(n),e.d(n,{default:function(){return A}});var r,o,a=e(885),u=e(8131),i=e(4473),c=e(7313),s=e(4004),f=e(7292),l=e(168),d=e(7427),g=e(244),m=e(6417),p=g.ZP.span(r||(r=(0,l.Z)(["\n  background: ",";\n  background-blend-mode: multiply;\n  mix-blend-mode: multiply;\n\ttransition: scale 50ms ease-out;\n"])),(function(t){return t.theme===d.b3.DARK?"radial-gradient(49.66% 42.81% at 52.18% 56.64%, rgba(0, 0, 0, 0.5) 0%, rgba(1, 45, 45, 0.5) 30.21%, rgba(255, 255, 255, 0.5) 100%)":"radial-gradient(49.66% 42.81% at 52.18% 56.64%, rgba(227, 227, 227, 0.5) 0%, rgba(234, 234, 234, 0.5) 24%, rgba(255, 255, 255, 0.5) 100%)"})),h=function(t){var n=t.scale,e=(0,c.useContext)(s.I).theme;return(0,m.jsx)(p,{theme:e,className:"shadow",style:{transform:"scale(".concat(n,")")}})},b=g.ZP.div(o||(o=(0,l.Z)(["\n  background: ",";\n  border-radius: 100px;\n  box-shadow: ",";\n  color: ",";\n  display: inline-flex;\n  justify-content: center;\n  align-items: center;\n  padding: 10px 18px;\n  transition: opacity 250ms ease-out;\n  opacity: ",";\n  pointer-events: ",";\n"])),f.DM.grey6,f.E6.dark,f.DM.grey1,(function(t){return t.show?1:0}),(function(t){return t.show?"auto":"none"})),x=e(4427),k=function(t){var n=(0,c.useState)({x:0,y:0}),e=(0,a.Z)(n,2),r=e[0],o=e[1];return(0,x.Z)("mousemove",(function(t){o({x:t.offsetX,y:t.offsetY})}),t),r},w=function(t){var n=t.text,e=t.show,r=t.container,o=(0,c.useState)(n),u=(0,a.Z)(o,2),i=u[0],s=u[1],f=k(r),l=(0,c.useState)(f),d=(0,a.Z)(l,2),g=d[0],p=d[1];return(0,c.useEffect)((function(){e&&p(f)}),[e]),(0,c.useEffect)((function(){n&&s(n)}),[n]),(0,m.jsx)(b,{style:{position:"absolute",top:g.y-10,left:g.x-10},show:e,"aria-hidden":!e,children:i})},y=e(2982),v=e(2463),D=e(677),I=e(7575),Z=e(5448),R=function(){var t=(0,c.useState)([]),n=(0,a.Z)(t,2),e=n[0],r=n[1],o=(0,Z.O)(D.EI),u=(0,v.D)(o),i=(0,c.useCallback)((function(t){var n=t.filter((function(t){return!e.some((function(n){return n.workerIdx===t.workerIdx}))&&1===t.state})),o=t.filter((function(t){return e.some((function(n){return n.workerIdx===t.workerIdx}))&&-1===t.state}));r([].concat((0,y.Z)(function(t,n){return t.filter((function(t){return!n.some((function(n){return n.workerIdx===t.workerIdx}))}))}(e,o)),(0,y.Z)(function(t){return t.map((function(t){var n=t.workerIdx,e=t.loc,r=e.country,o=e.count,a=e.coords;return{startLng:I.zg[0],startLat:I.zg[1],endLng:a[0],endLat:a[1],country:r,count:o,workerIdx:n}}))}(n))))}),[e]);(0,c.useEffect)((function(){u!==o&&i(o)}),[u,o,i]);var s=(0,c.useMemo)((function(){return e.map((function(t){return{lng:t.endLng,lat:t.endLat}}))}),[e]);return{arcs:e,points:s}},A=function(){var t=(0,Z.O)(D.GG),n=(0,c.useContext)(s.I),e=n.width,r=n.theme,o=e<f.Bs?300:400,l=(0,c.useRef)(!1),g=(0,c.useState)(null),p=(0,a.Z)(g,2),b=p[0],x=p[1],k=(0,c.useRef)(),y=(0,c.useRef)(),v=R(),A=v.arcs,C=v.points,S=(0,c.useState)(14),j=(0,a.Z)(S,2),L=j[0],E=j[1];(0,c.useEffect)((function(){t&&k.current.pointOfView({lat:20,lng:I.zg[0],altitude:2.5},1e3)}),[A,t]),(0,c.useEffect)((function(){k.current.controls().autoRotate=!b}),[b]);return(0,m.jsxs)(i.W,{ref:y,size:o,children:[(0,m.jsx)(h,{scale:1/(L/2)}),(0,m.jsx)(u.Z,{ref:k,onGlobeReady:function(){if(!l.current){l.current=!0;var t=k.current.controls(),n=k.current.camera(),e=k.current.scene();t.autoRotate=!0,t.maxDistance=1500,t.minDistance=300,t.autoRotateSpeed=1;var r=e.children.find((function(t){return"DirectionalLight"===t.type}));r&&(r.intensity=.25);var o=r.clone();o.position.set(0,500,0),n.add(o),e.add(n),e.remove(r)}},width:o,height:o,enablePointerInteraction:!0,waitForGlobeReady:!0,showAtmosphere:!0,atmosphereColor:f.DM.brand,atmosphereAltitude:.25,backgroundColor:"rgba(0,0,0,0)",backgroundImageUrl:null,globeImageUrl:r===d.b3.DARK?f.j5:f.ck,arcsData:A,arcColor:["rgba(0, 188, 212, 0.75)","rgba(255, 193, 7, 0.75)"],arcDashLength:1,arcDashGap:.5,arcDashInitialGap:1,arcDashAnimateTime:500,arcsTransitionDuration:0,arcStroke:2.5,arcAltitudeAutoScale:.3,onArcHover:x,pointsData:C,pointColor:function(){return f.DM.green},pointRadius:1.5,pointAltitude:0,pointsTransitionDuration:500,onZoom:function(t){var n=Math.round(10*t.altitude)/10;n!==L&&E(n)}}),(0,m.jsx)(w,{text:!!b&&"".concat(b.count," People from ").concat(b.country),show:!!b,container:y})]})}}}]);