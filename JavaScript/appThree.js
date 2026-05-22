// ============================================================
// appThree.js - Aplicação Gráfica "Sonic Retro" (Green Hill Zone)
// Biblioteca: Three.js v0.165.0 via CDN
// ============================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
var carregadorGLTF = new GLTFLoader();

document.addEventListener('DOMContentLoaded', Start);

// --- Sem. 0/1: Variáveis globais (cena, câmara, renderer, relógio) ---
var cena = new THREE.Scene();
var camaraPerspetiva = new THREE.PerspectiveCamera(60, 4 / 3, 0.1, 1000);
var camaraOrtografica;
var cameraAtiva;
var modoCamara = 'perspetiva';
var renderer = new THREE.WebGLRenderer({ antialias: true });
var relogio = new THREE.Clock();

// Referências para objetos do cenário
var chao, sol, nuvens = [];
var aneisDecorativos = [], vegetacao = [], palmeiras = [];
var sonicPlaceholder, sonicBola, modoBola = false, oceano, espumaOndas = [];
var ceu, ilhasDistantes = [], barcos = [], gaivotas = [];
var tufosRelva = [];
// Passo 3: cache de materials partilhados para folhas de árvores
var materiaisFolhas = {};

// Sem. 3: TextureLoader para carregar texturas externas
var carregadorTexturas = new THREE.TextureLoader();

// --- Sem. 0/1: Configuração do Renderer (sRGB, PCFSoft shadows) ---
renderer.setSize(window.innerWidth - 15, window.innerHeight - 100);
renderer.setClearColor(0x6ec6ff, 1.0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
window.addEventListener('resize', function() { _needsResize = true; });

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// Sem. 0/1: Posição inicial da câmara perspetiva
camaraPerspetiva.position.set(25, 12, 10);
camaraPerspetiva.lookAt(0, 3, 0);
inicializarCameraOrtografica();
cameraAtiva = camaraPerspetiva;

// --- Sem. 4: Estado do teclado WASD (+ Shift/Ctrl para câmara livre) ---
var teclasPremidas = { w: false, a: false, s: false, d: false, shift: false, control: false };

// --- Sem. 4: Modo câmara follow ---
var modoSeguirSonic = false;

// --- Animações do Sonic (membros separados) ---
var sonicMixer = null;
var sonicClips = [];
var sonicAcaoAtiva = null;
var sonicEmMovimento = false;
var sonicOssos = {};
var sonicPartes = {};

// Posições dos pivôs em espaço local do sonicPlaceholder (ajustar conforme o modelo)
var SONIC_PIVOT = {
    ombroEsq:   new THREE.Vector3(-0.28, 0.65, 0.0),
    ombroDir:   new THREE.Vector3( 0.28, 0.65, 0.0),
    quadrilEsq: new THREE.Vector3(-0.13, 0.27, 0.0),
    quadrilDir: new THREE.Vector3( 0.13, 0.27, 0.0),
};

// --- Sem. 5: Modo câmara livre (WASD + Shift/Ctrl + arrastar rato) ---
var modoCamaraLivre = false;
var camLivreYaw = 0;
var camLivrePitch = 0;
var camLivreArrastando = false;
var camLivreUltimoMouse = { x: 0, y: 0 };

// --- Estado da câmara ---
var vistaAtual = 'Vista geral (3/4)';

// Vector3 pré-alocados — evitam criação de objetos GC no render loop
var _vCamForward      = new THREE.Vector3();
var _vCamRight        = new THREE.Vector3();
var _vCamDeslocamento = new THREE.Vector3();
var _vCamLookAt       = new THREE.Vector3();
var _vAlvoSeguir      = new THREE.Vector3();
// Recursos partilhados lazy-init (flores, relva)
var _matCauleFlor = null, _matCentroFlor = null, _matsPetalaFlor = null;
var _geoCauleFlor = null, _geoCentroFlor = null, _geoPetalaFlor = null;
var _matsRelvaTufos = null, _geosRelvaTufo = null;
// Flag de resize — evita chamar renderer.setSize() em cada frame
var _needsResize = false;

var labelVista = document.createElement('div');
labelVista.style.cssText = 'position:fixed;top:10px;left:10px;background:rgba(0,0,0,0.7);color:#fff;padding:8px 16px;font-family:monospace;font-size:14px;border-radius:6px;z-index:100;pointer-events:none;';
labelVista.textContent = 'Vista: Vista geral — O/0: side-scroll | C: Follow Sonic | F: câmara livre';
document.body.appendChild(labelVista);

function inicializarCameraOrtografica() {
    var largura = window.innerWidth - 15;
    var altura = window.innerHeight - 100;
    var aspect = largura / altura;
    var frustumSize = 18;

    camaraOrtografica = new THREE.OrthographicCamera(
        -frustumSize * aspect,
         frustumSize * aspect,
         frustumSize,
        -frustumSize,
         0.1,
       200
    );

    camaraOrtografica.position.set(30, 12, 0);
    camaraOrtografica.up.set(0, 1, 0);
    camaraOrtografica.lookAt(0, 3, 0);
    camaraOrtografica.updateProjectionMatrix();
}

function atualizarLabelVista() {
    if (modoCamaraLivre) {
        labelVista.textContent = 'Vista: Câmara livre — WASD mover | Roda do rato sobe/desce | ESC: sair';
    } else if (modoCamara === 'ortografica') {
        labelVista.textContent = 'Vista: Side-scroll ortográfica — O/0: alternar | C: Follow Sonic | F: câmara livre';
    } else if (modoSeguirSonic) {
        labelVista.textContent = 'Vista: Follow Sonic — O/0: alternar | C: sair follow | F: câmara livre';
    } else {
        labelVista.textContent = 'Vista: ' + vistaAtual + ' — O/0: side-scroll | C: Follow Sonic | F: câmara livre';
    }
}

function ativarCamaraLivre() {
    modoCamaraLivre = true;
    var dir = new THREE.Vector3();
    camaraPerspetiva.getWorldDirection(dir);
    camLivreYaw = Math.atan2(-dir.x, -dir.z);
    camLivrePitch = Math.asin(Math.max(-1, Math.min(1, dir.y)));
    if (modoCamara === 'ortografica') {
        modoCamara = 'perspetiva';
        cameraAtiva = camaraPerspetiva;
    }
    modoSeguirSonic = false;
    vistaAtual = 'Câmara livre';
    renderer.domElement.requestPointerLock();
    atualizarLabelVista();
}

function desativarCamaraLivre() {
    modoCamaraLivre = false;
    if (document.pointerLockElement === renderer.domElement) {
        document.exitPointerLock();
    }
    renderer.domElement.style.cursor = 'default';
    atualizarLabelVista();
}

function alternarCamaraLivre() {
    if (modoCamaraLivre) desativarCamaraLivre();
    else ativarCamaraLivre();
}

function alternarModoCamara() {
    if (modoCamara === 'perspetiva') {
        modoCamara = 'ortografica';
        cameraAtiva = camaraOrtografica;
    } else {
        modoCamara = 'perspetiva';
        cameraAtiva = camaraPerspetiva;
    }
    // Sol e nuvens rodam +90° em Y para virarem a sua face (normal +Z) para o eixo +X
    // onde se encontra a câmara ortográfica
    var rotY = (modoCamara === 'ortografica') ? Math.PI / 2 : 0;
    if (sol) {
        sol.rotation.y = rotY;
        // Reposicionar para ficar dentro do frustum em ambos os modos
        if (modoCamara === 'ortografica') {
            sol.position.set(-12, 30, 22);
        } else {
            sol.position.set(0, 18, -50);
        }
    }
    for (var i = 0; i < nuvens.length; i++) {
        nuvens[i].rotation.y = rotY;
    }
    atualizarLabelVista();
}

document.addEventListener('keydown', function(evento) {
    var tecla = evento.key;
    var teclaLower = tecla.toLowerCase();
    if (tecla === 'o' || tecla === 'O' || tecla === '0') {
        if (modoCamaraLivre) desativarCamaraLivre();
        alternarModoCamara();
    }
    if (teclaLower === 'c') {
        if (modoCamaraLivre) desativarCamaraLivre();
        modoSeguirSonic = !modoSeguirSonic;
        if (modoSeguirSonic) vistaAtual = 'Follow Sonic';
        else vistaAtual = 'Vista geral';
        atualizarLabelVista();
    }
    if (teclaLower === 'f') {
        alternarCamaraLivre();
    }
    // ESC sai da câmara livre
    if (evento.code === 'Escape' && modoCamaraLivre) {
        desativarCamaraLivre();
    }
    // WASD
    if (teclasPremidas.hasOwnProperty(teclaLower)) teclasPremidas[teclaLower] = true;
    // Sem. 4: alternar modo bola (Espaço) — ignorado em câmara livre
    if (evento.code === 'Space' && !modoCamaraLivre && sonicPlaceholder && sonicBola) {
        modoBola = !modoBola;
        sonicPlaceholder.visible = !modoBola;
        sonicBola.visible = modoBola;
        sonicBola.position.copy(sonicPlaceholder.position);
    }
});

document.addEventListener('keyup', function(evento) {
    var tecla = evento.key.toLowerCase();
    if (teclasPremidas.hasOwnProperty(tecla)) teclasPremidas[tecla] = false;
});

// --- Sem. 5: FPS mouse-look com Pointer Lock ---
document.addEventListener('pointerlockchange', function() {
    if (document.pointerLockElement !== renderer.domElement && modoCamaraLivre) {
        desativarCamaraLivre();
    }
});

renderer.domElement.addEventListener('click', function(e) {
    if (modoCamaraLivre) return;
    // Clicar na canvas ativa pointer lock se não estivermos noutro modo
});

document.addEventListener('mousemove', function(e) {
    if (!modoCamaraLivre) return;
    if (document.pointerLockElement === renderer.domElement) {
        var sensibilidade = 0.002;
        camLivreYaw   -= e.movementX * sensibilidade;
        camLivrePitch -= e.movementY * sensibilidade;
        var lim = Math.PI / 2 - 0.05;
        if (camLivrePitch >  lim) camLivrePitch =  lim;
        if (camLivrePitch < -lim) camLivrePitch = -lim;
    }
});

renderer.domElement.addEventListener('wheel', function(e) {
    if (!modoCamaraLivre) return;
    e.preventDefault();
    var velY = 4;
    if (e.deltaY < 0) camaraPerspetiva.position.y += velY;
    else camaraPerspetiva.position.y -= velY;
}, { passive: false });

// --- Sem. 0/1: Textura xadrez (Canvas 2D, RepeatWrapping 8x8) ---
function criarTexturaXadrez() {
    var canvas = document.createElement('canvas');
    var tamanho = 512;
    var casas = 8;
    var tamanhoCasa = tamanho / casas;
    var contexto = canvas.getContext('2d');

    canvas.width = tamanho;
    canvas.height = tamanho;

    for (var linha = 0; linha < casas; linha++) {
        for (var coluna = 0; coluna < casas; coluna++) {
            if ((linha + coluna) % 2 === 0) {
                contexto.fillStyle = '#d88b36';
            } else {
                contexto.fillStyle = '#f4c46d';
            }

            contexto.fillRect(coluna * tamanhoCasa, linha * tamanhoCasa, tamanhoCasa, tamanhoCasa);
        }
    }

    contexto.strokeStyle = '#7b4318';
    contexto.lineWidth = 6;

    for (var i = 0; i <= casas; i++) {
        var pos = i * tamanhoCasa;
        contexto.beginPath(); contexto.moveTo(pos, 0); contexto.lineTo(pos, tamanho); contexto.stroke();
        contexto.beginPath(); contexto.moveTo(0, pos); contexto.lineTo(tamanho, pos); contexto.stroke();
    }

    var textura = new THREE.CanvasTexture(canvas);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.wrapS = THREE.RepeatWrapping;
    textura.wrapT = THREE.RepeatWrapping;
    textura.repeat.set(8, 8);

    return textura;
}

// --- Sem. 3: Textura procedural da relva (CanvasTexture) ---
function criarTexturaRelva() {
    var canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    var ctx = canvas.getContext('2d');

    // Gradiente base: mais escuro em baixo (solo), mais claro em cima (luz)
    var grad = ctx.createLinearGradient(0, 512, 0, 0);
    grad.addColorStop(0, '#1a6020');
    grad.addColorStop(0.45, '#2d8f2d');
    grad.addColorStop(1,  '#4ab34a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Manchas de variação de tons (solo húmido, zonas de sombra, zonas iluminadas)
    var tons = ['#196b19', '#228B22', '#2d9e2d', '#3dae3d', '#5bc05b', '#166016', '#4dbb4d', '#1f751f'];
    for (var i = 0; i < 3500; i++) {
        ctx.fillStyle = tons[Math.floor(Math.random() * tons.length)];
        var x = Math.random() * 512, y = Math.random() * 512;
        ctx.globalAlpha = 0.2 + Math.random() * 0.45;
        ctx.fillRect(x, y, 1 + Math.random() * 5, 1 + Math.random() * 3);
    }

    // Lâminas de relva desenhadas com curvas bezier (aspeto orgânico)
    var coresBrins = ['#1a7020', '#236b23', '#2d9a2d', '#155c15', '#3bab3b', '#0f5c0f'];
    ctx.globalAlpha = 0.75;
    for (var j = 0; j < 900; j++) {
        var bx = Math.random() * 512;
        var by = Math.random() * 512;
        var bh = 9 + Math.random() * 18;
        var bend = (Math.random() - 0.5) * 8;
        ctx.strokeStyle = coresBrins[Math.floor(Math.random() * coresBrins.length)];
        ctx.lineWidth = 0.7 + Math.random() * 1.2;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + bend * 0.5, by - bh * 0.55, bx + bend, by - bh);
        ctx.stroke();
    }

    // Reflexos solares nas pontas das lâminas (brilhos claros)
    ctx.globalAlpha = 0.18;
    for (var k = 0; k < 300; k++) {
        var lx = Math.random() * 512, ly = Math.random() * 512;
        ctx.fillStyle = '#b8f0b8';
        ctx.beginPath();
        ctx.arc(lx, ly, 0.4 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1.0;
    var tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    return tex;
}

// --- Sem. 3: Textura procedural da areia (CanvasTexture) ---
function criarTexturaAreia() {
    var canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f2d98b';
    ctx.fillRect(0, 0, 256, 256);
    var tons = ['#e8c876', '#f7e4a8', '#d4b96a', '#f0d080'];
    for (var i = 0; i < 1200; i++) {
        ctx.fillStyle = tons[Math.floor(Math.random() * tons.length)];
        var x = Math.random() * 256, y = Math.random() * 256;
        ctx.globalAlpha = 0.3 + Math.random() * 0.5;
        ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    ctx.globalAlpha = 1.0;
    var tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    return tex;
}

// --- Sem. 0/1 + Sem. 3: Terreno linear (relva + terra xadrez, z=+35 a -35) ---
var texturaXadrezPartilhada, materialTerraPartilhado, materialRelvaPartilhado, materialRelvaEscPartilhado;

function inicializarMateriaisTerreno() {
    texturaXadrezPartilhada = criarTexturaXadrez();
    materialTerraPartilhado = new THREE.MeshStandardMaterial({
        map: texturaXadrezPartilhada,
        roughness: 0.75
    });
    // Sem. 3: textura procedural da relva aplicada via map
    materialRelvaPartilhado = new THREE.MeshStandardMaterial({
        map: criarTexturaRelva(), color: 0x39b54a, roughness: 0.65
    });
    materialRelvaEscPartilhado = new THREE.MeshStandardMaterial({
        color: 0x2a7d3a, roughness: 0.7
    });
}

function criarSegmentoTerreno(x, z, largX, compZ, altura, elevacao, temRelva) {
    var grupo = new THREE.Group();

    var terra = new THREE.Mesh(
        new THREE.BoxGeometry(largX, altura, compZ),
        materialTerraPartilhado
    );
    terra.position.y = -altura / 2;
    terra.receiveShadow = true;
    terra.castShadow = true;
    grupo.add(terra);

    if (temRelva !== false) {
        var relva = new THREE.Mesh(
            new THREE.BoxGeometry(largX + 0.3, 0.35, compZ + 0.3),
            materialRelvaPartilhado
        );
        relva.position.y = 0.175;
        relva.receiveShadow = true;
        relva.castShadow = true;
        grupo.add(relva);

        var bordoRelva = new THREE.Mesh(
            new THREE.BoxGeometry(largX + 0.6, 0.15, compZ + 0.6),
            materialRelvaEscPartilhado
        );
        bordoRelva.position.y = 0.075;
        bordoRelva.receiveShadow = true;
        grupo.add(bordoRelva);
    }

    grupo.position.set(x, elevacao, z);
    cena.add(grupo);
    return grupo;
}

function criarTerreno() {
    inicializarMateriaisTerreno();

    // === Layout do Nível 1 ===
    // Progressão: Z+ (spawn) → Z- (fim), com 3 plataformas separadas por 2 espaços.
    // Espaço 1 (z+15 → z+5): ponte (a colocar)
    // Espaço 2 (z=-20 → z=-36): loop GLB (+6 unidades para o modelo caber)
    // No fim da Plat 3, rampa vira à direita para a Plat 4 onde está a placa final.

    // --- Plataforma 1: Spawn → primeiro espaço ---
    criarSegmentoTerreno(0, 27.5, 12, 25, 4, 0);   // z=+40 a z=+15

    // --- Plataforma 2: segundo segmento ---
    criarSegmentoTerreno(0, -7.5, 12, 25, 4, 0);   // z=+5  a z=-20

    // --- Plataforma 3: terceiro segmento (recuou 6 u por causa do loop) ---
    criarSegmentoTerreno(0, -46, 12, 20, 4, 0);    // z=-36 a z=-56

    // --- Plataforma 4: continuação do nível ---
    criarSegmentoTerreno(0, -73.5, 12, 25, 4, 0);  // z=-61 a z=-86

    // === PRAIA: Areia com perfil elíptico + degradê de cor (areia→mar) ===
    var segsX = 48, segsZ = 72;
    var geoAreia = new THREE.PlaneGeometry(130, 180, segsX, segsZ);
    geoAreia.rotateX(-Math.PI / 2);
    var posAreia = geoAreia.attributes.position;
    var rX = 65, rZ = 90;
    // Cores: areia dourada → areia molhada → cor do mar
    var corAreia  = new THREE.Color(0xf2d98b);
    var corMolhada = new THREE.Color(0xc8a84b);
    var corMar    = new THREE.Color(0x0e5e8c);
    var cores = [];
    for (var v = 0; v < posAreia.count; v++) {
        var vx = posAreia.getX(v);
        var vz = posAreia.getZ(v);
        var distElip = Math.sqrt((vx / rX) * (vx / rX) + (vz / rZ) * (vz / rZ));
        var t = Math.max(0, (distElip - 0.4) / 0.6);
        var descida = t > 0 ? (1 - Math.cos(t * Math.PI * 0.5)) * 4.5 : 0;
        if (distElip > 1.0) descida = 4.5 + (distElip - 1.0) * 3;
        posAreia.setY(v, -descida);
        // Degradê: 0→0.5 areia→molhada, 0.5→1+ molhada→mar
        var cor = new THREE.Color();
        if (t < 0.5) {
            cor.lerpColors(corAreia, corMolhada, t * 2);
        } else {
            cor.lerpColors(corMolhada, corMar, Math.min(1, (t - 0.5) * 2));
        }
        cores.push(cor.r, cor.g, cor.b);
    }
    posAreia.needsUpdate = true;
    geoAreia.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
    geoAreia.computeVertexNormals();
    var materialAreia = new THREE.MeshStandardMaterial({
        map: criarTexturaAreia(),
        vertexColors: true,
        roughness: 0.9
    });
    var areia = new THREE.Mesh(geoAreia, materialAreia);
    areia.position.set(0, -2.8, -20);
    areia.receiveShadow = true;
    cena.add(areia);

    // Montes de areia
    var materialAreiaClara = new THREE.MeshStandardMaterial({ color: 0xf7e4a8, roughness: 0.95 });
    var montesAreia = [[-20,20,3],[22,15,2.5],[-22,-10,2.8],[20,-25,3.2],[-25,30,2],[25,-5,2.3],[-18,-30,2.5],[18,32,2.8]];
    for (var m = 0; m < montesAreia.length; m++) {
        var monte = new THREE.Mesh(new THREE.SphereGeometry(montesAreia[m][2], 12, 8), materialAreiaClara);
        monte.position.set(montesAreia[m][0], -3.0, montesAreia[m][1]);
        monte.scale.set(1.5, 0.25, 1.2);
        monte.receiveShadow = true;
        cena.add(monte);
    }

    // === MAR: Oceano com ondas ===
    var materialOceano = new THREE.MeshPhysicalMaterial({ color: 0x0e5e8c, roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.88, side: THREE.DoubleSide });
    // Passo 1: segmentos reduzidos de 120×120 para 60×60 (4× menos vértices)
    oceano = new THREE.Mesh(new THREE.PlaneGeometry(300, 300, 60, 60), materialOceano);
    oceano.rotation.x = -Math.PI / 2;
    oceano.position.set(0, -3.2, 0);
    oceano.receiveShadow = true;
    cena.add(oceano);

    // === ONDAS DE PRAIA: removidas (performance + visual) ===
}

// --- Sem. 0/1: Skybox retro (céu gradiente, sol, nuvens animadas) ---
function criarSkyboxRetro() {
    cena.fog = new THREE.Fog(0x6ec6ff, 80, 200);

    // Céu em gradiente (esfera invertida com ShaderMaterial)
    var shaderCeu = {
        uniforms: {
            corTopo:  { value: new THREE.Color(0x1e5fa8) },
            corBase:  { value: new THREE.Color(0x9ed8ff) },
            offset:   { value: 33 },
            exponent: { value: 0.6 }
        },
        vertexShader: [
            'varying vec3 vWorldPosition;',
            'void main() {',
            '  vec4 worldPosition = modelMatrix * vec4(position, 1.0);',
            '  vWorldPosition = worldPosition.xyz;',
            '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
            '}'
        ].join('\n'),
        fragmentShader: [
            'uniform vec3 corTopo;',
            'uniform vec3 corBase;',
            'uniform float offset;',
            'uniform float exponent;',
            'varying vec3 vWorldPosition;',
            'void main() {',
            '  float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;',
            '  gl_FragColor = vec4(mix(corBase, corTopo, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);',
            '}'
        ].join('\n')
    };
    var matCeu = new THREE.ShaderMaterial({
        uniforms: shaderCeu.uniforms,
        vertexShader: shaderCeu.vertexShader,
        fragmentShader: shaderCeu.fragmentShader,
        side: THREE.BackSide,
        depthWrite: false
    });
    ceu = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), matCeu);
    cena.add(ceu);

    // Sol — recentrado para ser visível em ambos os modos de câmara
    var geometriaSol = new THREE.CircleGeometry(3, 48);
    var materialSol = new THREE.MeshBasicMaterial({ color: 0xffdc4a });
    sol = new THREE.Mesh(geometriaSol, materialSol);
    sol.position.set(0, 18, -50);
    cena.add(sol);

    var materialNuvem = new THREE.MeshBasicMaterial({ color: 0xffffff });
    var geosNuvem = [
        new THREE.SphereGeometry(1.20, 16, 8),
        new THREE.SphereGeometry(1.45, 16, 8),
        new THREE.SphereGeometry(1.70, 16, 8)
    ];

    for (var n = 0; n < 14; n++) {
        var grupoNuvem = new THREE.Group();
        var posX = -40 + n * 7;
        var posY = 20 + (n % 4) * 1.8;
        // Espalhar nuvens em Z para serem visíveis na vista ortográfica lateral
        var posZ = -35 + (n * 5) % 70;

        for (var parte = 0; parte < 3; parte++) {
            var esferaNuvem = new THREE.Mesh(geosNuvem[parte], materialNuvem);
            esferaNuvem.position.set(parte * 1.2, parte === 1 ? 0.45 : 0, 0);
            grupoNuvem.add(esferaNuvem);
        }

        grupoNuvem.position.set(posX, posY, posZ);
        grupoNuvem.scale.set(1.4, 0.55, 0.35);
        nuvens.push(grupoNuvem);
        cena.add(grupoNuvem);
    }
}

// --- Sem. 5: Ilhas distantes no horizonte (low-poly, decorativas) ---
function criarIlhasDistantes() {
    var matAreiaIlha = new THREE.MeshBasicMaterial({ color: 0xe8c876 });
    var matVerdeClaro = new THREE.MeshBasicMaterial({ color: 0x39b54a });
    var matVerdeEsc   = new THREE.MeshBasicMaterial({ color: 0x16853a });
    var matTronco     = new THREE.MeshBasicMaterial({ color: 0x6b4226 });
    var matRocha      = new THREE.MeshBasicMaterial({ color: 0x7a7670 });
    var matRochaEsc   = new THREE.MeshBasicMaterial({ color: 0x5a5650 });
    var matArbusto    = new THREE.MeshBasicMaterial({ color: 0x2d8a3a });
    var matsFlores    = [
        new THREE.MeshBasicMaterial({ color: 0xff6b6b }),
        new THREE.MeshBasicMaterial({ color: 0xffd93d }),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    ];

    // [angulo (rad), distancia, raio, altura] — ilhas em volta da cena
    var defs = [
        [0.3,   95, 7, 1.2],
        [1.1,  100, 5, 0.9],
        [1.9,   85, 8, 1.4],
        [2.7,  105, 6, 1.0],
        [3.6,  140, 5, 0.8],
        [4.5,  100, 7, 1.3],
        [5.4,   95, 6, 1.1]
    ];

    // Ilhas extra posicionadas para serem visíveis na vista ortográfica (x<0, |z|<28)
    // formato: [x, z, raio, altura] (override)
    var extras = [
        [-85,  -20, 7, 1.3],
        [-90,    0, 6, 1.2],
        [-95,   20, 6, 1.1],
        // Ilhas à direita do cenário (X positivo)
        [ 75,  -18, 7, 1.4],
        [ 80,   12, 6, 1.2],
        [ 70,    0, 5, 1.0]
    ];

    for (var i = 0; i < defs.length + extras.length; i++) {
        var d, x, z;
        if (i < defs.length) {
            d = defs[i];
            x = Math.cos(d[0]) * d[1];
            z = Math.sin(d[0]) * d[1];
        } else {
            var e = extras[i - defs.length];
            x = e[0]; z = e[1];
            d = [0, 0, e[2], e[3]];
        }

        var grupo = new THREE.Group();
        // RNG determinístico por ilha (posição como seed) — distribuições reproduzíveis
        var rngIlha = criarRNG(Math.floor(x * 13 + z * 31 + 1000));

        // Base de areia (cilindro achatado)
        var base = new THREE.Mesh(
            new THREE.CylinderGeometry(d[2], d[2] * 1.15, d[3], 12),
            matAreiaIlha
        );
        base.position.y = d[3] / 2 - 1.5;
        grupo.add(base);

        // Camada de relva por cima da areia (disco verde mais pequeno que a base)
        var raioRelva = d[2] * 0.78;
        var relva = new THREE.Mesh(
            new THREE.CylinderGeometry(raioRelva * 0.95, raioRelva, 0.25, 14),
            matVerdeClaro
        );
        relva.position.y = d[3] - 1.5 + 0.125;
        grupo.add(relva);

        // Bordo escuro da relva (pequena moldura)
        var bordo = new THREE.Mesh(
            new THREE.CylinderGeometry(raioRelva * 1.02, raioRelva * 1.02, 0.08, 14),
            matVerdeEsc
        );
        bordo.position.y = d[3] - 1.5 + 0.04;
        grupo.add(bordo);

        // Palmeiras — escala aumentada para serem visíveis à distância
        var escalaBase = d[2] * 0.30;
        // Densidade aumentada
        var numPalm = Math.max(3, Math.floor(d[2] * 0.8 + rngIlha.range(0, 2)));

        for (var p = 0; p < numPalm; p++) {
            // Distribuição em "anéis" para preencher sem todas no centro
            var angP = rngIlha.next() * Math.PI * 2;
            var distP = Math.sqrt(rngIlha.next()) * raioRelva * 0.85;
            var dx = Math.cos(angP) * distP;
            var dz = Math.sin(angP) * distP;
            // Variação aleatória de escala (±20%)
            var escalaP = escalaBase * rngIlha.range(0.80, 1.20);

            var palm = criarPalmeira(x + dx, z + dz, escalaP);
            // Reparentar para a ilha (em coords locais, em cima da relva)
            cena.remove(palm);
            palm.position.set(dx, d[3] - 1.5 + 0.25, dz);
            grupo.add(palm);
        }

        // Arbustos (esferas verdes achatadas) — 5-10 por ilha, maiores
        var numArbustos = 5 + Math.floor(rngIlha.next() * 6);
        for (var a = 0; a < numArbustos; a++) {
            var angA = rngIlha.next() * Math.PI * 2;
            var distA = Math.sqrt(rngIlha.next()) * raioRelva * 0.85;
            var tamA = rngIlha.range(0.35, 0.70) * d[2] * 0.35;
            var arbusto = new THREE.Mesh(
                new THREE.SphereGeometry(tamA, 8, 6),
                rngIlha.next() > 0.5 ? matArbusto : matVerdeEsc
            );
            arbusto.position.set(
                Math.cos(angA) * distA,
                d[3] - 1.5 + 0.25 + tamA * 0.7,
                Math.sin(angA) * distA
            );
            arbusto.scale.y = 0.7;
            grupo.add(arbusto);
        }

        // Rochas (esferas cinzentas achatadas) — 3-6 por ilha, junto à areia, maiores
        var numRochas = 3 + Math.floor(rngIlha.next() * 4);
        for (var r = 0; r < numRochas; r++) {
            var angR = rngIlha.next() * Math.PI * 2;
            var distR = rngIlha.range(0.7, 0.98) * d[2];
            var tamR = rngIlha.range(0.30, 0.60) * d[2] * 0.30;
            var rocha = new THREE.Mesh(
                new THREE.SphereGeometry(tamR, 6, 5),
                rngIlha.next() > 0.5 ? matRocha : matRochaEsc
            );
            rocha.position.set(
                Math.cos(angR) * distR,
                d[3] - 1.5 + tamR * 0.5,
                Math.sin(angR) * distR
            );
            rocha.scale.set(1.2, 0.55, 1.0);
            rocha.rotation.y = rngIlha.next() * Math.PI;
            grupo.add(rocha);
        }

        // Aglomerados de flores (pontos coloridos) — 6-12 por ilha, maiores
        var numFlores = 6 + Math.floor(rngIlha.next() * 7);
        for (var f = 0; f < numFlores; f++) {
            var angF = rngIlha.next() * Math.PI * 2;
            var distF = Math.sqrt(rngIlha.next()) * raioRelva * 0.80;
            var tamF = rngIlha.range(0.15, 0.30) * (d[2] / 5);
            var flor = new THREE.Mesh(
                new THREE.SphereGeometry(tamF, 6, 4),
                matsFlores[Math.floor(rngIlha.next() * matsFlores.length)]
            );
            flor.position.set(
                Math.cos(angF) * distF,
                d[3] - 1.5 + 0.30 + tamF,
                Math.sin(angF) * distF
            );
            grupo.add(flor);
        }

        grupo.position.set(x, -1.5, z);
        ilhasDistantes.push(grupo);
        cena.add(grupo);
    }
}

// --- Sem. 5: Barcos a navegar em loop circular à volta das ilhas ---
function criarBarco() {
    var configs = [
        { cx: -71, cz: -30, raio: 6, vel: 0.18, fase: 0,        corVela: 0xfafafa },
        { cx: -63, cz:  28, raio: 6, vel: 0.13, fase: Math.PI,  corVela: 0xffe28a }
    ];

    for (var b = 0; b < configs.length; b++) {
        var cfg = configs[b];
        var barco = new THREE.Group();

        // Materiais partilhados por barco
        var matCasco  = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.80 });
        var matDeck   = new THREE.MeshStandardMaterial({ color: 0xd4956a, roughness: 0.75 });
        var matMad    = new THREE.MeshStandardMaterial({ color: 0x4a2a0e, roughness: 0.88 });
        var matVela   = new THREE.MeshBasicMaterial({ color: cfg.corVela, side: THREE.DoubleSide });
        var matMetal  = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.45, metalness: 0.75 });
        var matBarril = new THREE.MeshStandardMaterial({ color: 0xa06030, roughness: 0.88 });

        // === CASCO com proa afilada (BoxGeometry deformada) ===
        // Orientação: Z+ = proa (frente), Z- = popa (trás)
        var geoHull = new THREE.BoxGeometry(2.4, 1.5, 7.5, 1, 2, 8);
        var posH = geoHull.attributes.position;
        for (var hv = 0; hv < posH.count; hv++) {
            var hz = posH.getZ(hv);
            var hx = posH.getX(hv);
            var hy = posH.getY(hv);
            var newX = hx;
            // Afinar proa: X encolhe de z=1.5 até z=3.75
            if (hz > 1.5) {
                var tBow = Math.min(1.0, (hz - 1.5) / 2.25);
                newX *= (1.0 - tBow * 0.96);
            }
            // Fundo arredondado (bilge)
            if (hy < -0.1) {
                var tBilge = Math.min(1.0, (-hy - 0.1) / 0.65);
                newX *= (1.0 - tBilge * 0.30);
            }
            posH.setX(hv, newX);
        }
        posH.needsUpdate = true;
        geoHull.computeVertexNormals();
        var hull = new THREE.Mesh(geoHull, matCasco);
        hull.castShadow = true;
        hull.receiveShadow = true;
        barco.add(hull);

        // Superestrutura da popa (castelo de popa)
        var popaSupra = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 1.6), matCasco);
        popaSupra.position.set(0, 0.88, -3.0);
        popaSupra.castShadow = true;
        barco.add(popaSupra);

        // === CONVÉS principal ===
        var deck = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.14, 5.0), matDeck);
        deck.position.set(0, 0.83, -0.85);
        deck.receiveShadow = true;
        barco.add(deck);

        // Convés elevado da popa
        var deckPopa = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 1.55), matDeck);
        deckPopa.position.set(0, 1.30, -3.0);
        barco.add(deckPopa);

        // === MASTRO: base no convés (y≈0.83), topo a y≈9.8 ===
        var mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.13, 9.0, 8), matMad);
        mastro.position.set(0, 5.3, 0.1);
        mastro.castShadow = true;
        barco.add(mastro);

        // Verga principal (y=8.0)
        var verga = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 5.4, 6), matMad);
        verga.rotation.z = Math.PI / 2;
        verga.position.set(0, 8.0, 0.1);
        barco.add(verga);


        // Pau de proa (bowsprit) inclinado para a frente
        var bowsprit = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 2.5, 6), matMad);
        bowsprit.rotation.x = -Math.PI / 9;
        bowsprit.position.set(0, 1.25, 3.2);
        barco.add(bowsprit);

        // === VELA PRINCIPAL com billow ===
        // Topo alinhado com verga (y=8.0), altura=3.5 → centro y=6.25
        var geoVela = new THREE.PlaneGeometry(5.0, 3.5, 6, 5);
        var posVela = geoVela.attributes.position;
        for (var vi = 0; vi < posVela.count; vi++) {
            var velX = posVela.getX(vi);
            var velY = posVela.getY(vi);
            var normVX = velX / 2.5;
            var normVY = (velY + 1.75) / 3.5;
            var billow = Math.cos(normVX * Math.PI * 0.5) * Math.sin(normVY * Math.PI) * 1.4;
            var ripple = Math.sin(normVX * Math.PI * 1.5) * Math.sin(normVY * Math.PI * 2.0) * 0.18;
            posVela.setZ(vi, billow + ripple);
        }
        posVela.needsUpdate = true;
        geoVela.computeVertexNormals();
        var vela = new THREE.Mesh(geoVela, matVela);
        vela.position.set(0, 6.25, 0.12);
        barco.add(vela);


        // === CROW'S NEST ===
        var cesto = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.38, 0.42, 8), matDeck);
        cesto.position.set(0, 9.6, 0.1);
        barco.add(cesto);

        // Bandeira ondulante no topo do crow's nest (simula vento)
        var geoBand = new THREE.PlaneGeometry(1.5, 0.55, 10, 4);
        var posBand = geoBand.attributes.position;
        for (var bv = 0; bv < posBand.count; bv++) {
            var bx = posBand.getX(bv);
            var by = posBand.getY(bv);
            var t = (bx + 0.75) / 1.5;
            posBand.setZ(bv, Math.sin(t * Math.PI) * 0.38);
            posBand.setY(bv, by - t * 0.12);
        }
        posBand.needsUpdate = true;
        geoBand.computeVertexNormals();
        var bandeira = new THREE.Mesh(
            geoBand,
            new THREE.MeshBasicMaterial({ color: 0xcc1111, side: THREE.DoubleSide })
        );
        // Deslocar para que o bordo esquerdo (t=0) fique no mastro (x=0)
        bandeira.position.set(0.75, 9.85, 0.1);
        barco.add(bandeira);

        // === CORDAS DE RIGGING ===
        var barcoRef = barco;
        var matMadRef = matMad;
        function addCorda(x1, y1, z1, x2, y2, z2) {
            var dir = new THREE.Vector3(x2 - x1, y2 - y1, z2 - z1);
            var len = dir.length();
            var mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, len, 4), matMadRef);
            mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
            mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
            barcoRef.add(mesh);
        }
        addCorda(-2.7, 8.0, 0.1,  0, 2.42, 2.77);  // forestay E → ponta do bowsprit
        addCorda( 2.7, 8.0, 0.1,  0, 2.42, 2.77);  // forestay D → ponta do bowsprit
        addCorda(0, 9.8, 0.1,  0,    1.2, -3.8);   // backstay → popa
        addCorda(-2.7, 8.0, 0.1, -1.15, 0.9, 1.5); // shroud E superior
        addCorda( 2.7, 8.0, 0.1,  1.15, 0.9, 1.5); // shroud D superior

        // === CANHÕES (um em cada borda) ===
        for (var cl = 0; cl < 2; cl++) {
            var lado = cl === 0 ? -1 : 1;
            var baseCan = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.65), matDeck);
            baseCan.position.set(lado * 0.9, 0.96, 1.1);
            barco.add(baseCan);
            var canhao = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.0, 8), matMetal);
            canhao.rotation.z = Math.PI / 2;
            canhao.position.set(lado * 1.18, 0.96, 1.1);
            barco.add(canhao);
        }

        // === BARRIS no convés ===
        var barisPosZ = [-1.0, -1.0, -1.2];
        var barisX    = [-0.5,  0.1,  0.6];
        for (var bi2 = 0; bi2 < 3; bi2++) {
            var barril = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.38, 8), matBarril);
            barril.position.set(barisX[bi2], 0.97, barisPosZ[bi2]);
            barco.add(barril);
            for (var ai = 0; ai < 2; ai++) {
                var aro = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.02, 4, 12), matMetal);
                aro.rotation.x = Math.PI / 2;
                aro.position.set(barisX[bi2], 0.97 + (ai === 0 ? -0.1 : 0.1), barisPosZ[bi2]);
                barco.add(aro);
            }
        }

        // === RAILING (postes + corrimão) ===
        var postes = [
            [ 1.18, 2.4], [ 1.18, 0.9], [ 1.18, -0.6], [ 1.18, -2.0],
            [-1.18, 2.4], [-1.18, 0.9], [-1.18, -0.6], [-1.18, -2.0],
            [ 0.65, -3.05], [-0.65, -3.05]
        ];
        for (var ri = 0; ri < postes.length; ri++) {
            var poste = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 5), matMad);
            poste.position.set(postes[ri][0], 0.93, postes[ri][1]);
            barco.add(poste);
        }
        var railE = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 5.1), matMad);
        railE.position.set(-1.18, 1.32, -0.3);
        barco.add(railE);
        var railD = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 5.1), matMad);
        railD.position.set( 1.18, 1.32, -0.3);
        barco.add(railD);
        var railPopa = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 0.05), matMad);
        railPopa.position.set(0, 1.32, -3.05);
        barco.add(railPopa);

        barco.userData = { cx: cfg.cx, cz: cfg.cz, raio: cfg.raio, vel: cfg.vel, fase: cfg.fase };
        barcos.push(barco);
        cena.add(barco);
    }
}

// --- Sem. 5: Gaivotas animadas no céu ---
function criarGaivotas() {
    var matAsa = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

    for (var g = 0; g < 6; g++) {
        var grupo = new THREE.Group();

        // 2 planos finos formando "V" (asas)
        var asaE = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.25), matAsa);
        asaE.position.x = -0.55;
        asaE.userData.lado = -1;
        grupo.add(asaE);

        var asaD = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.25), matAsa);
        asaD.position.x = 0.55;
        asaD.userData.lado = 1;
        grupo.add(asaD);

        // Trajetória circular ampla, cada gaivota com fase própria
        grupo.userData.raio = 40 + g * 5;
        grupo.userData.altura = 14 + (g % 3) * 2;
        grupo.userData.fase = g * 1.05;
        grupo.userData.vel = 0.15 + (g % 3) * 0.04;

        cena.add(grupo);
        gaivotas.push(grupo);
    }
}

// --- Sem. 0/1: Iluminação (AmbientLight + DirectionalLight c/ sombras) ---
function criarLuzes() {
    var luzAmbiente = new THREE.AmbientLight(0xffffff, 0.45);
    cena.add(luzAmbiente);

    var luzDirecional = new THREE.DirectionalLight(0xfff1b8, 2.0);
    luzDirecional.position.set(-5, 18, -30);
    luzDirecional.castShadow = true;
    luzDirecional.shadow.mapSize.width = 2048;
    luzDirecional.shadow.mapSize.height = 2048;
    luzDirecional.shadow.camera.near = 0.5;
    luzDirecional.shadow.camera.far = 120;
    luzDirecional.shadow.camera.left = -45;
    luzDirecional.shadow.camera.right = 45;
    luzDirecional.shadow.camera.top = 45;
    luzDirecional.shadow.camera.bottom = -45;
    cena.add(luzDirecional);
}

// --- Sem. 2: Looping — modelo GLB do Blender ---
function criarLooping() {
    carregadorGLTF.load('assets/loop.glb', function(gltf) {
        var loop = gltf.scene;

        // Escala automática: altura do loop ≈ 12 unidades
        var box = new THREE.Box3().setFromObject(loop);
        var size = new THREE.Vector3();
        box.getSize(size);
        var escala = 16 / Math.max(size.x, size.y, size.z);
        loop.scale.setScalar(escala);

        // Re-calcular bbox após escala — centrar em X, fundo a y=0
        box.setFromObject(loop);
        var centroX = (box.min.x + box.max.x) / 2;
        loop.position.set(-centroX, -box.min.y - 2.3, -28.75);

        loop.traverse(function(node) {
            if (node.isMesh) {
                node.castShadow    = true;
                node.receiveShadow = true;
            }
        });

        cena.add(loop);
    }, undefined, function(err) {
        console.error('[loop.glb] erro ao carregar:', err);
    });
}

// --- Sem. 2 + Sem. 3: Vegetação Procedural (ramificação recursiva, folhas cross-plane, 3 presets) ---

// --- RNG simples com seed (para árvores reproduzíveis) ---
function criarRNG(seed) {
    var s = seed || 12345;
    return {
        next: function() {
            s = (s * 16807 + 0) % 2147483647;
            return (s - 1) / 2147483646;
        },
        range: function(min, max) {
            return min + this.next() * (max - min);
        }
    };
}

// Gerador de ramo recursivo (CylinderGeometry + gnarliness + folhas no nível final)
function gerarRamo(grupo, origem, orientacao, comprimento, raio, nivel, maxNivel, params, rng) {
    var numSeccoes = params.seccoes || 6;
    var alturaSeccao = comprimento / numSeccoes;
    var posAtual = origem.clone();
    var dirAtual = new THREE.Vector3(0, 1, 0).applyEuler(orientacao).normalize();

    var materialRamo = new THREE.MeshStandardMaterial({
        color: params.corTronco || 0x8B5E3C,
        roughness: 0.8
    });

    var pontosRamo = [posAtual.clone()];

    for (var i = 0; i < numSeccoes; i++) {
        var progresso = i / numSeccoes;
        var raioSeccao = raio * (1.0 - progresso * 0.6);
        if (raioSeccao < 0.04) raioSeccao = 0.04;

        var gnarliness = (params.gnarliness || 0.15) * Math.max(1.0, 1.0 / Math.sqrt(raioSeccao));
        dirAtual.x += rng.range(-gnarliness, gnarliness);
        dirAtual.z += rng.range(-gnarliness, gnarliness);
        dirAtual.normalize();

        if (params.gravidade) {
            dirAtual.y += params.gravidade * 0.02;
            dirAtual.normalize();
        }

        var proxPos = posAtual.clone().add(dirAtual.clone().multiplyScalar(alturaSeccao));

        var centro = posAtual.clone().add(proxPos).multiplyScalar(0.5);
        var diff = proxPos.clone().sub(posAtual);
        var dist = diff.length();

        var raioTopo = raio * (1.0 - (progresso + 1.0 / numSeccoes) * 0.6);
        if (raioTopo < 0.03) raioTopo = 0.03;

        var cilindro = new THREE.Mesh(
            new THREE.CylinderGeometry(raioTopo, raioSeccao, dist, 8),
            materialRamo
        );

        cilindro.position.copy(centro);

        var eixo = new THREE.Vector3(0, 1, 0);
        var quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(eixo, diff.clone().normalize());
        cilindro.quaternion.copy(quaternion);
        if (params.castShadow !== false) cilindro.castShadow = true;
        grupo.add(cilindro);

        posAtual = proxPos;
        pontosRamo.push(posAtual.clone());
    }

    var raioFinal = raio * 0.4;
    if (raioFinal < 0.03) raioFinal = 0.03;

    if (nivel < maxNivel) {
        var numFilhos = params.filhosPorNivel ? params.filhosPorNivel[nivel] : 3;
        for (var f = 0; f < numFilhos; f++) {
            var indiceSeccao = Math.floor(rng.range(numSeccoes * 0.3, numSeccoes));
            var pontoOrigem = pontosRamo[indiceSeccao];

            var anguloFilho = rng.range(0, Math.PI * 2);
            var inclinacaoFilho = rng.range(
                params.anguloFilhoMin || 0.3,
                params.anguloFilhoMax || 1.0
            );

            var orientacaoFilho = new THREE.Euler(
                inclinacaoFilho * Math.cos(anguloFilho),
                anguloFilho,
                inclinacaoFilho * Math.sin(anguloFilho)
            );

            var comprimentoFilho = comprimento * (params.escalaFilho || 0.6);
            var raioFilho = raioFinal * (params.escalaRaioFilho || 0.7);

            gerarRamo(grupo, pontoOrigem, orientacaoFilho, comprimentoFilho, raioFilho, nivel + 1, maxNivel, params, rng);
        }
    } else {
        gerarFolhas(grupo, pontosRamo, params, rng);
    }
}

// Gerador de folhas cross-plane (2 PlaneGeometry perpendiculares por cluster)
function gerarFolhas(grupo, pontosRamo, params, rng) {
    var numFolhas = params.folhasPorRamo || 4;
    var tamanhoFolha = params.tamanhoFolha || 1.2;

    var coresFolha = params.coresFolha || [0x2d8f2d, 0x39b54a, 0x4ab34a, 0x228B22];

    for (var i = 0; i < numFolhas; i++) {
        var indicePonto = Math.floor(rng.range(Math.max(0, pontosRamo.length - 4), pontosRamo.length));
        if (indicePonto >= pontosRamo.length) indicePonto = pontosRamo.length - 1;
        var posicao = pontosRamo[indicePonto].clone();
        posicao.x += rng.range(-0.5, 0.5);
        posicao.y += rng.range(-0.2, 0.5);
        posicao.z += rng.range(-0.5, 0.5);

        var cor = coresFolha[Math.floor(rng.next() * coresFolha.length)];
        // Passo 3: material partilhado por cor em vez de criar um novo por folha
        var materialFolha = materiaisFolhas[cor] || (materiaisFolhas[cor] = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.6, side: THREE.DoubleSide }));
        var tamanho = tamanhoFolha * rng.range(0.7, 1.3);
        var baseRotY = rng.range(0, Math.PI * 2);

        for (var cp = 0; cp < 2; cp++) {
            var plano = new THREE.Mesh(new THREE.PlaneGeometry(tamanho, tamanho, 3, 3), materialFolha);
            deformarFolha(plano, rng);
            plano.position.copy(posicao);
            plano.rotation.set(rng.range(-0.3, 0.3), baseRotY + cp * Math.PI / 2, 0);
            // Passo 2: castShadow removido — folhas cross-plane são planos finos
            plano.userData.eFolha = true;
            plano.userData.fase = rng.range(0, Math.PI * 2);
            grupo.add(plano);
        }
    }
}

// Deformação de vértices das folhas (curvatura natural)
function deformarFolha(mesh, rng) {
    var pos = mesh.geometry.attributes.position;
    for (var v = 0; v < pos.count; v++) {
        var x = pos.getX(v);
        var y = pos.getY(v);
        var dist = Math.sqrt(x * x + y * y);
        var curva = dist * dist * 0.15 * (rng ? rng.range(0.5, 1.5) : 1.0);
        pos.setZ(v, pos.getZ(v) + curva);
    }
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
}

// Sem. 3: textura de casca partilhada (carregada 1 vez, usada por todas as palmeiras)
var texturaCascaPartilhada = carregadorTexturas.load('https://threejs.org/examples/textures/hardwood2_bump.jpg');
texturaCascaPartilhada.wrapS = texturaCascaPartilhada.wrapT = THREE.RepeatWrapping;
texturaCascaPartilhada.repeat.set(1, 3);

// TIPO A: Palmeira Tropical (tronco reto segmentado + folhas largas em leque)
function criarPalmeira(posX, posZ, escala) {
    var grupo = new THREE.Group();
    escala = escala || 1.0;
    var seed = Math.floor(posX * 100 + posZ * 7);
    var rng = criarRNG(seed);

    var matTronco = new THREE.MeshStandardMaterial({ color: 0xD4A04A, roughness: 0.85 });
    var matAnel   = new THREE.MeshStandardMaterial({ color: 0xB8843A, roughness: 0.90 });
    var matFolha  = new THREE.MeshStandardMaterial({ color: 0x6DB53A, roughness: 0.5, side: THREE.DoubleSide });
    var matFolhaClara = new THREE.MeshStandardMaterial({ color: 0x88CC4A, roughness: 0.5, side: THREE.DoubleSide });

    var alturaTronco = 5.5 + rng.range(0, 1.5);
    var numSeg = 9;
    var hSeg = alturaTronco / numSeg;

    for (var i = 0; i < numSeg; i++) {
        var t = i / (numSeg - 1);
        var rBase = 0.28 - t * 0.12;
        var rTopo = 0.25 - t * 0.12;
        if (rBase < 0.10) rBase = 0.10;
        if (rTopo < 0.09) rTopo = 0.09;

        var seg = new THREE.Mesh(
            new THREE.CylinderGeometry(rTopo, rBase, hSeg * 0.78, 8),
            matTronco
        );
        seg.position.y = i * hSeg + hSeg * 0.39;
        seg.castShadow = true;
        grupo.add(seg);

        var anel = new THREE.Mesh(
            new THREE.CylinderGeometry(rBase + 0.04, rBase + 0.04, hSeg * 0.24, 8),
            matAnel
        );
        anel.position.y = i * hSeg;
        grupo.add(anel);
    }

    var topoY = alturaTronco;
    var numFolhas = 8;

    for (var f = 0; f < numFolhas; f++) {
        var anguloFolha = (f / numFolhas) * Math.PI * 2;
        var mat = f % 2 === 0 ? matFolha : matFolhaClara;

        var geoFolha = new THREE.PlaneGeometry(0.9, 0.85, 4, 12);
        geoFolha.translate(0, 0.425, 0); // base em y=0, ponta em y=0.85
        var pos = geoFolha.attributes.position;
        for (var v = 0; v < pos.count; v++) {
            var yL = pos.getY(v);
            var xL = pos.getX(v);
            var tv = yL / 0.85; // 0=base, 1=ponta
            // Forma: estreita na base e ponta, larga no meio
            var larg = Math.sin(tv * Math.PI);
            if (larg < 0.12) larg = 0.12;
            pos.setX(v, (xL / 0.45) * larg * 0.85);
            // Curva de droop: ponta cai para baixo em espaço local
            pos.setZ(v, -tv * tv * tv * 2.0);
        }
        pos.needsUpdate = true;
        geoFolha.computeVertexNormals();

        var folha = new THREE.Mesh(geoFolha, mat);
        var grupoFolha = new THREE.Group();
        grupoFolha.rotation.order = 'YXZ'; // Y primeiro (direção), X depois em eixo local → leque simétrico
        grupoFolha.add(folha);
        grupoFolha.position.y = topoY;
        grupoFolha.rotation.y = anguloFolha;
        grupoFolha.rotation.x = -0.75;
        grupoFolha.userData.anguloBase = grupoFolha.rotation.x;
        grupoFolha.userData.fase = f * 0.9;
        grupo.add(grupoFolha);
    }

    return finalizarVegetacao(grupo, posX, posZ, escala, 'palmeira', true);
}

// Helper para finalizar qualquer peça de vegetação
function finalizarVegetacao(grupo, posX, posZ, escala, tipo, ePalmeira) {
    grupo.scale.setScalar(escala);
    grupo.position.set(posX, 0, posZ);
    if (ePalmeira) palmeiras.push(grupo);
    vegetacao.push({ grupo: grupo, tipo: tipo });
    cena.add(grupo);
    return grupo;
}

// TIPO B: Árvore Ramificada (ramificação recursiva 2-3 níveis + gnarliness)
function criarArvoreRamificada(posX, posZ, escala) {
    var grupo = new THREE.Group();
    escala = escala || 1.0;
    var seed = Math.floor(Math.abs(posX * 73 + posZ * 137));
    var rng = criarRNG(seed);

    var params = {
        corTronco: 0x7B4B2A,
        gnarliness: 0.12,
        gravidade: 0.3,
        seccoes: 8,
        filhosPorNivel: [3, 3, 2],
        escalaFilho: 0.55,
        escalaRaioFilho: 0.6,
        anguloFilhoMin: 0.4,
        anguloFilhoMax: 1.1,
        folhasPorRamo: 5,
        tamanhoFolha: 1.4,
        coresFolha: [0x39b54a, 0x2d8f2d, 0x4ab34a, 0x228B22]
    };

    var comprimentoTronco = 3.5 + rng.range(0, 1.5);
    var raioTronco = 0.35 + rng.range(0, 0.1);

    gerarRamo(grupo, new THREE.Vector3(0, 0, 0), new THREE.Euler(0, 0, 0), comprimentoTronco, raioTronco, 0, 2, params, rng);
    return finalizarVegetacao(grupo, posX, posZ, escala, 'ramificada');
}

// TIPO C: Arbusto Tropical (múltiplos caules + flores opcionais)
function criarArbusto(posX, posZ, escala) {
    var grupo = new THREE.Group();
    escala = escala || 1.0;
    var seed = Math.floor(Math.abs(posX * 53 + posZ * 97));
    var rng = criarRNG(seed);

    var params = {
        corTronco: 0x5A3D20,
        gnarliness: 0.2,
        gravidade: 0.1,
        seccoes: 4,
        filhosPorNivel: [2],
        escalaFilho: 0.5,
        escalaRaioFilho: 0.6,
        anguloFilhoMin: 0.5,
        anguloFilhoMax: 1.2,
        folhasPorRamo: 6,
        tamanhoFolha: 0.8,
        coresFolha: [0x2d8f2d, 0x39b54a, 0x228B22, 0x4ab34a],
        castShadow: false
    };

    var numCaules = 3 + Math.floor(rng.next() * 3);
    for (var c = 0; c < numCaules; c++) {
        var anguloCaule = (c / numCaules) * Math.PI * 2 + rng.range(-0.3, 0.3);
        var inclinacao = rng.range(0.2, 0.6);

        gerarRamo(
            grupo,
            new THREE.Vector3(
                Math.cos(anguloCaule) * 0.15,
                0,
                Math.sin(anguloCaule) * 0.15
            ),
            new THREE.Euler(inclinacao * Math.cos(anguloCaule), anguloCaule, inclinacao * Math.sin(anguloCaule)),
            1.0 + rng.range(0, 0.8),
            0.08 + rng.range(0, 0.04),
            0,
            1,
            params,
            rng
        );
    }

    var temFlores = rng.next() > 0.4;
    if (temFlores) {
        var coresFlor = [0xff69b4, 0xffdd44, 0xff4444, 0xffffff];
        var corFlor = coresFlor[Math.floor(rng.next() * coresFlor.length)];
        var materialFlor = new THREE.MeshBasicMaterial({ color: corFlor });
        var numFlores = 3 + Math.floor(rng.next() * 5);
        for (var fl = 0; fl < numFlores; fl++) {
            var flor = new THREE.Mesh(
                new THREE.SphereGeometry(0.06, 6, 4),
                materialFlor
            );
            var af = rng.range(0, Math.PI * 2);
            var rf = 0.3 + rng.range(0, 0.6);
            flor.position.set(Math.cos(af) * rf, 0.5 + rng.range(0, 0.8), Math.sin(af) * rf);
            grupo.add(flor);
        }
    }

    // Hull esférico translúcido: dá volume e aparência densa ao arbusto
    var tamHull = 0.55 + rng.range(0, 0.55);
    var matHull = new THREE.MeshStandardMaterial({
        color: 0x267326, roughness: 0.9, transparent: true, opacity: 0.32
    });
    var hull = new THREE.Mesh(new THREE.SphereGeometry(tamHull, 9, 7), matHull);
    hull.position.y = 0.45 + tamHull * 0.45;
    hull.scale.set(1.05, 0.80, 1.05);
    grupo.add(hull);

    // Clusters de bagas (amoras / framboesas / cerejas) — 80% dos arbustos
    if (rng.next() > 0.20) {
        var tiposBaga = [
            { cor: 0x3a0f5e, brilho: 0x6b2a9e },   // amora (roxo escuro)
            { cor: 0xbb1133, brilho: 0xff3355 },     // framboesa (vermelho vivo)
            { cor: 0x7a0000, brilho: 0xcc2222 }      // cereja (vermelho escuro)
        ];
        var tipoBaga = tiposBaga[Math.floor(rng.next() * tiposBaga.length)];
        var matBaga   = new THREE.MeshStandardMaterial({ color: tipoBaga.cor,   roughness: 0.3, metalness: 0.15 });
        var matBrilho = new THREE.MeshBasicMaterial({ color: tipoBaga.brilho });

        var numClusters = 3 + Math.floor(rng.next() * 5);
        for (var cl = 0; cl < numClusters; cl++) {
            var angCl  = rng.next() * Math.PI * 2;
            var distCl = tamHull * rng.range(0.30, 0.90);
            var hCl    = 0.25 + rng.range(0, tamHull * 0.90);

            var numBagas = 3 + Math.floor(rng.next() * 5);
            for (var bg = 0; bg < numBagas; bg++) {
                var baga = new THREE.Mesh(
                    new THREE.SphereGeometry(0.033 + rng.range(0, 0.022), 6, 5),
                    matBaga
                );
                baga.position.set(
                    Math.cos(angCl) * distCl + rng.range(-0.11, 0.11),
                    hCl + rng.range(-0.07, 0.07),
                    Math.sin(angCl) * distCl + rng.range(-0.11, 0.11)
                );
                grupo.add(baga);

                // Ponto de brilho no topo de cada baga (reflexo de luz)
                var pont = new THREE.Mesh(new THREE.SphereGeometry(0.011, 4, 3), matBrilho);
                pont.position.copy(baga.position);
                pont.position.y += 0.026;
                pont.position.z -= 0.013;
                grupo.add(pont);
            }
        }
    }

    return finalizarVegetacao(grupo, posX, posZ, escala, 'arbusto');
}

// Posicionamento de toda a vegetação (3 tipos, simétricos)
function criarVegetacao() {
    // Plataformas: largX=12 → x vai de -6 a +6. Palmeiras em x=±5 são as únicas dentro.
    // Plat1: z=+15→+40 | Plat2: z=-20→+5 | Plat3: z=-30→-50 | Plat4: z=-55→-80
    // Palmeiras externas (x=±5) nas plataformas
    var palmZ = [
        // Plat1
        [38,1.0],[30,1.1],[22,1.0],[18,0.9],
        // Plat2
        [3,0.9],[-5,1.0],[-15,1.0],
        // Plat3
        [-39,1.05],[-48,1.0],[-54,0.9],
        // Plat4
        [-64,1.0],[-72,1.1],[-78,0.9],[-83,1.0]
    ];
    for (var i = 0; i < palmZ.length; i++) {
        criarPalmeira(-5, palmZ[i][0], palmZ[i][1]);
        criarPalmeira(5, palmZ[i][0], palmZ[i][1]);
    }
    // Arbustos (x=±4) — mesmas plataformas
    var arbZ = [
        // Plat1
        [35,1.0],[27,1.1],[19,0.9],
        // Plat2
        [1,0.9],[-8,1.0],[-17,1.0],
        // Plat3
        [-42,0.8],[-50,1.0],
        // Plat4
        [-67,0.9],[-75,1.0],[-81,0.8]
    ];
    for (var k = 0; k < arbZ.length; k++) {
        criarArbusto(-4, arbZ[k][0], arbZ[k][1]);
        criarArbusto(4, arbZ[k][0], arbZ[k][1]);
    }
}

// --- Sem. 2: Anéis (TorusGeometry + MeshPhysicalMaterial dourado) ---
function criarAneis() {
    var materialDourado = new THREE.MeshPhysicalMaterial({ color: 0xffcc33, metalness: 0.9, roughness: 0.12, reflectivity: 1.0, clearcoat: 0.3 });

    // Posições [x, y, z]: início, caminho, arco, loop, pós-loop, final
    var pos = [
        [-2,1.5,34],[0,1.8,34],[2,1.5,34],
        [0,1.5,28],[0,1.5,24],[0,1.5,20],[0,1.5,16],[0,1.5,12],
        [0,1.5,6],[0,2.0,4],[0,2.5,2],[0,2.0,0],[0,1.5,-2],
        [0,8,-8],[0,13,-8],
        [0,1.5,-18],[0,1.5,-24],[0,1.5,-32],
        [-2,1.5,-40],[0,1.8,-40],[2,1.5,-40]
    ];

    var materialBrilho  = new THREE.MeshBasicMaterial({ color: 0xffee88 });
    var geoAnelExterno  = new THREE.TorusGeometry(0.55, 0.13, 16, 48);
    var geoAnelBrilho   = new THREE.TorusGeometry(0.35, 0.04, 8, 32);
    for (var i = 0; i < pos.length; i++) {
        var grupoAnel = new THREE.Group();
        var anel = new THREE.Mesh(geoAnelExterno, materialDourado);
        // castShadow removido — anéis pequenos, sombra impercetível
        grupoAnel.add(anel);
        grupoAnel.add(new THREE.Mesh(geoAnelBrilho, materialBrilho));
        grupoAnel.position.set(pos[i][0], pos[i][1], pos[i][2]);
        grupoAnel.rotation.y = Math.PI / 2;
        aneisDecorativos.push(grupoAnel);
        cena.add(grupoAnel);
    }
}

// --- Sem. 2 + Sem. 4: Modelo do Sonic (membros separados) ---
function criarSonicPlaceholder() {
    sonicPlaceholder = new THREE.Group();
    sonicPartes = {};

    var ficheiros = [
        { nome: 'sonic_corpo.glb',     chave: 'corpo'    },
        { nome: 'sonic_cabeca.glb',    chave: 'cabeca'   },
        { nome: 'sonic_braco_esq.glb', chave: 'bracoEsq' },
        { nome: 'sonic_braco_dir.glb', chave: 'bracoDir' },
        { nome: 'sonic_perna_esq.glb', chave: 'pernaEsq' },
        { nome: 'sonic_perna_dir.glb', chave: 'pernaDir' },
    ];

    var scenes = {};
    var carregados = 0;

    ficheiros.forEach(function(f) {
        carregadorGLTF.load('assets/' + f.nome, function(gltf) {
            scenes[f.chave] = gltf.scene;
            if (++carregados === ficheiros.length) montarSonic(scenes);
        }, undefined, function(e) {
            console.warn('[Sonic] não encontrou assets/' + f.nome);
            if (++carregados === ficheiros.length) montarSonic(scenes);
        });
    });

    sonicPlaceholder.position.set(0, 0.35, 39);
    cena.add(sonicPlaceholder);

    // Bola — sonic_bola.glb (ativada com Espaço)
    sonicBola = new THREE.Group();
    sonicBola.visible = false;
    carregadorGLTF.load('assets/sonic_bola.glb', function(gltf) {
        var bola = gltf.scene;
        var box = new THREE.Box3().setFromObject(bola);
        var size = new THREE.Vector3();
        box.getSize(size);
        var maxDim = Math.max(size.x, size.y, size.z);
        var escalaAlvo = 1.4 / maxDim;
        bola.scale.setScalar(escalaAlvo);
        bola.rotation.x = -Math.PI / 2;
        var raio = (size.y * escalaAlvo) / 2;
        sonicBola.userData.raio = raio;
        sonicBola.position.set(0, 0.35 + raio, 39);
        bola.traverse(function(node) {
            if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
        });
        sonicBola.add(bola);
    }, undefined, function(err) { console.error('[sonic_bola] erro:', err); });
    cena.add(sonicBola);
}

// Monta o Sonic a partir dos membros carregados
function montarSonic(scenes) {
    if (!scenes.corpo) {
        console.error('[Sonic] sonic_corpo.glb não carregado — não é possível montar');
        return;
    }

    // Escala automática: corpo fica com altura ~0.9 unidades
    var boxRef = new THREE.Box3().setFromObject(scenes.corpo);
    var sizeRef = new THREE.Vector3();
    boxRef.getSize(sizeRef);
    var escala = 0.9 / Math.max(sizeRef.x, sizeRef.y, sizeRef.z);

    function preparar(mesh) {
        mesh.scale.setScalar(escala);
        mesh.traverse(function(n) {
            if (n.isMesh) {
                n.castShadow = true;
                n.receiveShadow = true;
                var mats = Array.isArray(n.material) ? n.material : [n.material];
                mats.forEach(function(m) { if (m) m.side = THREE.DoubleSide; });
            }
        });
        return mesh;
    }

    // Corpo e cabeça adicionados diretamente (sem pivot)
    sonicPartes.corpo = preparar(scenes.corpo);
    sonicPlaceholder.add(sonicPartes.corpo);

    if (scenes.cabeca) {
        sonicPartes.cabeca = preparar(scenes.cabeca);
        sonicPlaceholder.add(sonicPartes.cabeca);
    }

    // Pivot calculado em espaço-mundo: temporariamente anexa o mesh à cena,
    // mede onde a geometria está de facto, depois cria o pivot no topo do membro.
    function montarMembro(mesh, chave) {
        // 1. Añadir ao placeholder para que o matrixWorld seja válido
        sonicPlaceholder.add(mesh);
        sonicPlaceholder.updateMatrixWorld(true);

        // 2. Bbox em espaço-mundo
        var boxW = new THREE.Box3().setFromObject(mesh);
        sonicPlaceholder.remove(mesh);

        // 3. Converter para espaço local do sonicPlaceholder
        var sp = sonicPlaceholder.position;
        var cx = (boxW.min.x + boxW.max.x) / 2 - sp.x;
        var cy = boxW.max.y - sp.y;   // topo do membro → junta (ombro / anca)
        var cz = (boxW.min.z + boxW.max.z) / 2 - sp.z;

        // 4. Deslocar o mesh para que o topo fique em (0,0,0) do pivot
        mesh.position.x -= cx;
        mesh.position.y -= cy;
        mesh.position.z -= cz;

        // 5. Criar pivot e adicionar
        var pivot = new THREE.Group();
        pivot.position.set(cx, cy, cz);
        pivot.add(mesh);
        sonicPlaceholder.add(pivot);
        sonicPartes[chave] = pivot;

        console.log('[Sonic]', chave, 'pivot local:', cx.toFixed(3), cy.toFixed(3), cz.toFixed(3));
    }

    if (scenes.bracoDir) montarMembro(preparar(scenes.bracoDir), 'pivBracoDir');
    // Braço esquerdo: espelha o direito em X (independente do sonic_braco_esq.glb)
    if (scenes.bracoDir) {
        var cloneEsq = scenes.bracoDir.clone(true);
        cloneEsq.position.set(0, 0, 0);          // reset — bracoDir já foi movido pelo montarMembro
        cloneEsq.scale.set(-escala, escala, escala);
        montarMembro(cloneEsq, 'pivBracoEsq');
    }
    if (scenes.pernaEsq) montarMembro(preparar(scenes.pernaEsq), 'pivPernaEsq');
    if (scenes.pernaDir) montarMembro(preparar(scenes.pernaDir), 'pivPernaDir');

    // Correção cirúrgica: se o braço esquerdo ficou à direita (ou no centro),
    // espelha a posição X do braço direito (que foi detetada corretamente).
    if (sonicPartes.pivBracoEsq && sonicPartes.pivBracoDir) {
        if (sonicPartes.pivBracoEsq.position.x >= 0) {
            sonicPartes.pivBracoEsq.position.x = -sonicPartes.pivBracoDir.position.x;
        }
    }

    // Alinhar pés ao chão (Y mínimo = 0.35)
    var boxFinal = new THREE.Box3().setFromObject(sonicPlaceholder);
    sonicPlaceholder.position.y += (0.35 - boxFinal.min.y);
    sonicPlaceholder.updateMatrixWorld(true);

    var boxFinalSize = new THREE.Vector3();
    boxFinal.getSize(boxFinalSize);
    console.log('[Sonic] montado | escala:', escala.toFixed(3), '| altura total:', boxFinalSize.y.toFixed(2));
}

// Procura um bone por lista de nomes parciais (case-insensitive)
function pegarOsso() {
    var nomes = Array.prototype.slice.call(arguments);
    for (var i = 0; i < nomes.length; i++) {
        var n = nomes[i].toLowerCase();
        if (sonicOssos[n]) return sonicOssos[n];
        for (var k in sonicOssos) {
            if (k.indexOf(n) !== -1) return sonicOssos[k];
        }
    }
    return null;
}

// Toca uma animação do Sonic por nome (tentativa case-insensitive, fallback por índice)
function tocarAnimacaoSonic(nome, fadeDuracao) {
    if (!sonicMixer || sonicClips.length === 0) return;
    if (fadeDuracao === undefined) fadeDuracao = 0.2;

    var nomeLower = nome.toLowerCase();
    var clip = sonicClips.find(function(c) { return c.name.toLowerCase() === nomeLower; });
    if (!clip) {
        clip = sonicClips.find(function(c) { return c.name.toLowerCase().indexOf(nomeLower) !== -1; });
    }
    // Fallback por índice: idle → 0, run/walk → 1
    if (!clip) {
        var idx = (nomeLower === 'idle') ? 0 : Math.min(1, sonicClips.length - 1);
        clip = sonicClips[idx];
    }

    var novaAcao = sonicMixer.clipAction(clip);
    if (novaAcao === sonicAcaoAtiva) return;
    if (sonicAcaoAtiva) sonicAcaoAtiva.fadeOut(fadeDuracao);
    novaAcao.reset().fadeIn(fadeDuracao).play();
    sonicAcaoAtiva = novaAcao;
}

// --- Sem. 3: Elementos clássicos (Mola, Checkpoint, Ponte, Flores, Picos, Placa) ---

var elementosNivel = [];
var areasColisao = [];

// Mola / Spring: CylinderGeometry base + SphereGeometry topo amarelo
function criarMola(x, y, z) {
    var grupo = new THREE.Group();

    var materialBase = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.4 });
    var materialTopo = new THREE.MeshStandardMaterial({ color: 0xffdd00, roughness: 0.3, metalness: 0.5 });
    var materialMola = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.8 });

    var base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.3, 12), materialBase);
    base.position.y = 0.15;
    // castShadow removido — base pequena da mola
    grupo.add(base);

    for (var i = 0; i < 4; i++) {
        var aro = new THREE.Mesh(
            new THREE.TorusGeometry(0.3 + i * 0.02, 0.04, 8, 16),
            materialMola
        );
        aro.position.y = 0.35 + i * 0.12;
        aro.rotation.x = Math.PI / 2;
        grupo.add(aro);
    }

    var topo = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.15, 12), materialTopo);
    topo.position.y = 0.9;
    // castShadow removido — topo pequeno da mola
    grupo.add(topo);

    grupo.position.set(x, y, z);
    elementosNivel.push({ grupo: grupo, tipo: 'mola' });
    cena.add(grupo);
    return grupo;
}

// Checkpoint: CylinderGeometry poste + SphereGeometry topo azul
function criarCheckpoint(x, y, z) {
    var grupo = new THREE.Group();

    var materialPoste = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.7 });
    var materialTopo = new THREE.MeshStandardMaterial({ color: 0x2266ff, roughness: 0.3, metalness: 0.5 });

    var poste = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3, 8), materialPoste);
    poste.position.y = 1.5;
    // castShadow removido — poste fino do checkpoint
    grupo.add(poste);

    var esfera = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), materialTopo);
    esfera.position.y = 3.2;
    // castShadow removido — esfera pequena do checkpoint
    grupo.add(esfera);

    var basePoste = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.2, 8), materialPoste);
    basePoste.position.y = 0.1;
    grupo.add(basePoste);

    grupo.position.set(x, y, z);
    elementosNivel.push({ grupo: grupo, tipo: 'checkpoint' });
    cena.add(grupo);
    return grupo;
}

// Ponte: série de BoxGeometry (tábuas) com CylinderGeometry (cordas + corrimãos)
function criarPonte(x, y, z, comprimento, numTabuas, largura) {
    var grupo = new THREE.Group();
    numTabuas = numTabuas || 8;
    largura = largura || 10;

    var materialTabua = new THREE.MeshStandardMaterial({ color: 0x8B6B3D, roughness: 0.8 });
    var materialCorda = new THREE.MeshStandardMaterial({ color: 0x5A4020, roughness: 0.9 });

    var espacamento = comprimento / numTabuas;
    var meiaLarg = largura / 2;

    // Cordas principais nas laterais (ao nível das tábuas)
    for (var cx = -1; cx <= 1; cx += 2) {
        var corda = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, comprimento, 4), materialCorda);
        corda.rotation.x = Math.PI / 2;
        corda.position.set(cx * meiaLarg, 0, comprimento / 2);
        grupo.add(corda);
    }

    // Tábuas do chão da ponte
    for (var i = 0; i < numTabuas; i++) {
        var tabua = new THREE.Mesh(
            new THREE.BoxGeometry(largura, 0.12, espacamento * 0.85),
            materialTabua
        );
        tabua.position.set(0, -0.06, i * espacamento + espacamento / 2);
        tabua.receiveShadow = true;
        tabua.castShadow = true;
        grupo.add(tabua);
    }

    // Postes e corrimãos laterais
    var alturaPoste = 1.2;
    var numPostes = numTabuas + 1;
    var passoPoste = comprimento / numTabuas;
    for (var lado = -1; lado <= 1; lado += 2) {
        for (var pi = 0; pi < numPostes; pi++) {
            var poste = new THREE.Mesh(
                new THREE.CylinderGeometry(0.06, 0.06, alturaPoste, 6),
                materialCorda
            );
            poste.position.set(lado * meiaLarg, alturaPoste / 2, pi * passoPoste);
            poste.castShadow = true;
            grupo.add(poste);
        }
        // Corrimão horizontal no topo dos postes
        var corrimao = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, comprimento, 4),
            materialCorda
        );
        corrimao.rotation.x = Math.PI / 2;
        corrimao.position.set(lado * meiaLarg, alturaPoste, comprimento / 2);
        grupo.add(corrimao);
        // Corrimão intermédio (metade da altura)
        var corrimaoMedio = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, comprimento, 4),
            materialCorda
        );
        corrimaoMedio.rotation.x = Math.PI / 2;
        corrimaoMedio.position.set(lado * meiaLarg, alturaPoste * 0.5, comprimento / 2);
        grupo.add(corrimaoMedio);
    }

    grupo.position.set(x, y, z);
    elementosNivel.push({ grupo: grupo, tipo: 'ponte' });
    cena.add(grupo);
    return grupo;
}

// Tapete de velocidade (Speed Pad): placa plana dourada com setas
function criarTapeteVelocidade(x, y, z) {
    var grupo = new THREE.Group();
    var matBase = new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.6, roughness: 0.3, emissive: 0xffaa00, emissiveIntensity: 0.4 });
    var matSeta = new THREE.MeshStandardMaterial({ color: 0xff4400, metalness: 0.3, roughness: 0.4, emissive: 0xff2200, emissiveIntensity: 0.5 });

    // Placa base
    var base = new THREE.Mesh(new THREE.BoxGeometry(6, 0.12, 2.5), matBase);
    base.receiveShadow = true;
    grupo.add(base);

    // 3 setas a apontar em -Z (direção do nível)
    for (var s = 0; s < 3; s++) {
        var setaGrupo = new THREE.Group();
        // Haste da seta
        var haste = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.8), matSeta);
        haste.position.set(0, 0.14, 0.1);
        setaGrupo.add(haste);
        // Ponta triangular (cone achatado)
        var ponta = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 4), matSeta);
        ponta.rotation.x = Math.PI / 2;
        ponta.rotation.y = Math.PI / 4;
        ponta.position.set(0, 0.14, -0.45);
        setaGrupo.add(ponta);
        setaGrupo.position.x = (s - 1) * 1.6;
        grupo.add(setaGrupo);
    }

    grupo.position.set(x, y, z);
    cena.add(grupo);
    return grupo;
}

// Flores decorativas no chão
function criarFloresChao(x, y, z, numFlores) {
    // Lazy-init: materiais e geometrias criados uma vez, partilhados por todas as flores
    if (!_matCauleFlor) {
        _matCauleFlor  = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.7 });
        _matCentroFlor = new THREE.MeshBasicMaterial({ color: 0xffee00 });
        _matsPetalaFlor = [0xff69b4, 0xffdd44, 0xff4444, 0xffffff, 0xff88cc].map(function(c) {
            return new THREE.MeshBasicMaterial({ color: c });
        });
        _geoCauleFlor  = new THREE.CylinderGeometry(0.02, 0.03, 0.4, 4);
        _geoCentroFlor = new THREE.SphereGeometry(0.06, 6, 4);
        _geoPetalaFlor = new THREE.SphereGeometry(0.05, 6, 4);
    }

    numFlores = numFlores || 5;
    var grupo = new THREE.Group();

    for (var f = 0; f < numFlores; f++) {
        var grupoFlor = new THREE.Group();

        var caule = new THREE.Mesh(_geoCauleFlor, _matCauleFlor);
        caule.position.y = 0.2;
        grupoFlor.add(caule);

        var matPetala = _matsPetalaFlor[f % _matsPetalaFlor.length];
        var centro = new THREE.Mesh(_geoCentroFlor, _matCentroFlor);
        centro.position.y = 0.42;
        grupoFlor.add(centro);

        for (var p = 0; p < 5; p++) {
            var petala = new THREE.Mesh(_geoPetalaFlor, matPetala);
            var anguloPetala = (p / 5) * Math.PI * 2;
            petala.position.set(
                Math.cos(anguloPetala) * 0.08,
                0.42,
                Math.sin(anguloPetala) * 0.08
            );
            petala.scale.set(1.2, 0.6, 1.2);
            grupoFlor.add(petala);
        }

        grupoFlor.position.set(
            (Math.random() - 0.5) * 3,
            0,
            (Math.random() - 0.5) * 2
        );
        grupoFlor.scale.setScalar(0.8 + Math.random() * 0.6);
        grupo.add(grupoFlor);
    }

    grupo.position.set(x, y, z);
    cena.add(grupo);
    return grupo;
}

// --- Tufos de relva 3D (cross-plane cards) espalhados nas plataformas ---
function criarTufoRelva(x, z) {
    // Lazy-init: 7 materiais e 3 geometrias partilhados por todos os ~1600 tufos
    if (!_matsRelvaTufos) {
        _matsRelvaTufos = [0x1a5e1a, 0x1e6b1e, 0x245e24, 0x1c6020, 0x206820, 0x175318, 0x2a6a2a].map(function(cor) {
            return new THREE.MeshBasicMaterial({ color: cor, side: THREE.DoubleSide });
        });
        _geosRelvaTufo = [0.15, 0.22, 0.33].map(function(h) {
            var g = new THREE.PlaneGeometry(0.10, h);
            var p = g.attributes.position;
            for (var v = 0; v < p.count; v++) p.setY(v, p.getY(v) + h / 2);
            p.needsUpdate = true;
            return g;
        });
    }

    var mat = _matsRelvaTufos[Math.floor(Math.random() * _matsRelvaTufos.length)];
    var geo = _geosRelvaTufo[Math.floor(Math.random() * _geosRelvaTufo.length)];

    var grupo = new THREE.Group();
    for (var tc = 0; tc < 2; tc++) {
        var plano = new THREE.Mesh(geo, mat);
        plano.rotation.y = tc * Math.PI / 2;
        grupo.add(plano);
    }

    grupo.position.set(x, 0.375, z);
    grupo.rotation.y = Math.random() * Math.PI;
    grupo.userData.faseBrisa = Math.random() * Math.PI * 2;

    tufosRelva.push(grupo);
    cena.add(grupo);
    return grupo;
}

function criarTufosRelvaNasPlataformas() {
    // Dimensões ligeiramente menores que as plataformas para não ficar nas bordas
    var plats = [
        { cx: 0, cz:  27.5, lx: 10, lz: 22 },
        { cx: 0, cz:  -7.5, lx: 10, lz: 22 },
        { cx: 0, cz: -40.0, lx: 10, lz: 17 },
        { cx: 0, cz: -67.5, lx: 10, lz: 22 }
    ];
    var densidade = 2.0; // tufos/m²  (~1600 tufos total)
    plats.forEach(function(p) {
        var num = Math.floor(p.lx * p.lz * densidade);
        for (var ti = 0; ti < num; ti++) {
            var tx = p.cx + (Math.random() - 0.5) * p.lx;
            var tz = p.cz + (Math.random() - 0.5) * p.lz;
            criarTufoRelva(tx, tz);
        }
    });
    console.log('[Relva] ' + tufosRelva.length + ' tufos criados');
}

// Placa final (Goal Post): poste + placa rotativa
function criarPlacaFinal(x, y, z) {
    var grupo = new THREE.Group();

    var materialPoste = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.7 });
    var materialPlaca = new THREE.MeshStandardMaterial({ color: 0x2244aa, roughness: 0.3 });
    var materialEstrela = new THREE.MeshBasicMaterial({ color: 0xffdd00 });

    var poste = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.5, 8), materialPoste);
    poste.position.y = 1.75;
    // castShadow removido — poste fino da placa final
    grupo.add(poste);

    var placa = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 0.1), materialPlaca);
    placa.position.y = 3.2;
    // castShadow removido — placa pequena
    grupo.add(placa);

    var estrela = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), materialEstrela);
    estrela.position.y = 3.2;
    estrela.position.z = 0.1;
    grupo.add(estrela);

    grupo.position.set(x, y, z);
    elementosNivel.push({ grupo: grupo, tipo: 'placaFinal' });
    cena.add(grupo);
    return grupo;
}

// Picos / Spikes: ConeGeometry afiados
function criarPicos(x, y, z, opcoes) {
    var grupo = new THREE.Group();
    var numPicos = 3;
    var largura = null;

    if (typeof opcoes === 'number') {
        numPicos = opcoes || 3;
        largura = numPicos * 0.7 + 0.4;
    } else if (typeof opcoes === 'object' && opcoes !== null) {
        largura = opcoes.largura || 0;
        numPicos = opcoes.numPicos || 3;
        if (largura <= 0) {
            largura = numPicos * 0.7 + 0.4;
        }
    } else {
        largura = numPicos * 0.7 + 0.4;
    }

    var materialPico = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.15, metalness: 0.9 });
    var materialBasePico = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.4 });
    var materialColisao = new THREE.MeshBasicMaterial({ visible: false });

    // Base vermelha contínua que ocupa toda a largura definida
    var basePicos = new THREE.Mesh(
        new THREE.BoxGeometry(largura, 0.2, 0.8),
        materialBasePico
    );
    basePicos.position.y = 0.1;
    basePicos.receiveShadow = true;
    grupo.add(basePicos);

    var passo = numPicos > 1 ? largura / (numPicos - 1) : 0;
    var xInicio = -largura / 2;

    for (var p = 0; p < numPicos; p++) {
        var pico = new THREE.Mesh(
            new THREE.ConeGeometry(0.2, 1.0, 8),
            materialPico
        );
        pico.position.set(xInicio + p * passo, 0.7, 0);
        pico.castShadow = true;
        grupo.add(pico);
    }

    // Colisor invisível que cobre toda a área de picos
    var colisorPicos = new THREE.Mesh(
        new THREE.BoxGeometry(largura, 0.8, 0.8),
        materialColisao
    );
    colisorPicos.position.set(0, 0.4, 0);
    colisorPicos.userData = { tipo: 'picos', largura: largura, profundidade: 0.8 };
    grupo.add(colisorPicos);

    grupo.position.set(x, y, z);
    elementosNivel.push({ grupo: grupo, tipo: 'picos', colisao: colisorPicos });
    areasColisao.push(colisorPicos);
    cena.add(grupo);
    return grupo;
}

// Posicionamento dos elementos clássicos ao longo do nível
function criarElementosNivel() {
    var y = 0.35;

    // ── Plataforma 1 (z=+40 a z=+15) ────────────────────────────
    // Obstáculo 1: Picos com mola centrada
    criarPicos(0, y, 32, { largura: 10, numPicos: 14 });
    criarMola(0, y, 32);
    // Tapete de velocidade antes do espaço da ponte
    criarTapeteVelocidade(0, y, 17);

    // ── Espaço 1 (z=+5 a z=+15): ponte de ligação Plat1→Plat2 ──
    criarPonte(0, 0.35, 5, 10, 10, 10);

    // ── Plataforma 2 (z=+5 a z=-20) ─────────────────────────────
    // Checkpoint 1: início da plataforma 2
    criarCheckpoint(0, y, 4);
    // Obstáculo 2: Picos — passar pelo lado ESQUERDO
    criarPicos(3, y, -4, { largura: 6, numPicos: 8 });
    // Obstáculo 3: Picos — passar pelo lado DIREITO
    criarPicos(-3, y, -14, { largura: 6, numPicos: 8 });
    // Checkpoint 2: fim da plataforma 2
    criarCheckpoint(0, y, -19);

    // ── Espaço 2 (z=-20 a z=-36): loop GLB ──────────────────────

    // ── Plataforma 3 (z=-36 a z=-56) ────────────────────────────
    // Obstáculo 4: Picos com mola centrada
    criarPicos(0, y, -43, { largura: 10, numPicos: 14 });
    criarMola(0, y, -43);

    // ── Espaço 3 (z=-56 a z=-61): ponte de ligação Plat3→Plat4 ──
    criarPonte(0, 0.35, -61, 5, 5, 10);

    // ── Plataforma 4 (z=-61 a z=-86): paralela, mais comprida ────
    // Placa final no extremo da plataforma 4
    criarPlacaFinal(0, y, -84);

    // Flores simétricas nas plataformas 1-3
    var floresSim = [
        [4,39,5],[4,33,4],[4,26,5],[4,20,4],[4,17,3],
        [4,3,4],[4,-4,3],[4,-16,4],
        [4,-38,4],[4,-48,4],[4,-54,3]
    ];
    for (var i = 0; i < floresSim.length; i++) {
        var f = floresSim[i];
        criarFloresChao(-f[0], y, f[1], f[2]);
        criarFloresChao(f[0], y, f[1], f[2]);
    }
    // Flores na plataforma 4
    criarFloresChao(-4, y, -66, 4);
    criarFloresChao(4, y, -66, 4);
    criarFloresChao(-4, y, -76, 3);
    criarFloresChao(4, y, -76, 3);
}

// --- Sem. 0/1: Atualização responsiva das dimensões ---
function atualizarDimensoes() {
    var largura = window.innerWidth - 15;
    var altura = window.innerHeight - 100;

    renderer.setSize(largura, altura);

    camaraPerspetiva.aspect = largura / altura;
    camaraPerspetiva.updateProjectionMatrix();

    if (camaraOrtografica) {
        var frustumSize = 18;
        var aspect = largura / altura;
        camaraOrtografica.left = -frustumSize * aspect;
        camaraOrtografica.right = frustumSize * aspect;
        camaraOrtografica.top = frustumSize;
        camaraOrtografica.bottom = -frustumSize;
        camaraOrtografica.updateProjectionMatrix();
    }
}

// --- Sem. 0/1 + Sem. 2 + Sem. 4: Loop principal (animações + render) ---
function loop() {
    var delta = relogio.getDelta();
    var tempo = relogio.elapsedTime;

    if (_needsResize) { atualizarDimensoes(); _needsResize = false; }

    // --- Sem. 5: Atualizar câmara livre (WASD + Shift/Ctrl + arrastar rato) ---
    if (modoCamaraLivre) {
        var velCam = (teclasPremidas.shift && teclasPremidas.control ? 40 : 20) * delta;
        var cosP = Math.cos(camLivrePitch);
        _vCamForward.set(-Math.sin(camLivreYaw) * cosP, Math.sin(camLivrePitch), -Math.cos(camLivreYaw) * cosP);
        _vCamRight.set(Math.cos(camLivreYaw), 0, -Math.sin(camLivreYaw));
        _vCamDeslocamento.set(0, 0, 0);
        if (teclasPremidas.w) _vCamDeslocamento.addScaledVector(_vCamForward,  velCam);
        if (teclasPremidas.s) _vCamDeslocamento.addScaledVector(_vCamForward, -velCam);
        if (teclasPremidas.a) _vCamDeslocamento.addScaledVector(_vCamRight,   -velCam);
        if (teclasPremidas.d) _vCamDeslocamento.addScaledVector(_vCamRight,    velCam);
        camaraPerspetiva.position.add(_vCamDeslocamento);
        _vCamLookAt.copy(camaraPerspetiva.position).add(_vCamForward);
        camaraPerspetiva.lookAt(_vCamLookAt);
    }

    // --- Animação dos membros do Sonic (pivot nos ombros e ancas) ---
    if (!modoBola &&
        sonicPartes.pivBracoEsq && sonicPartes.pivBracoDir &&
        sonicPartes.pivPernaEsq && sonicPartes.pivPernaDir) {
        var fase = tempo * 8;
        if (sonicEmMovimento) {
            sonicPartes.pivBracoEsq.rotation.x =  Math.sin(fase) * 0.7;
            sonicPartes.pivBracoDir.rotation.x = -Math.sin(fase) * 0.7;
            sonicPartes.pivPernaEsq.rotation.x =  Math.sin(fase) * 0.9;
            sonicPartes.pivPernaDir.rotation.x = -Math.sin(fase) * 0.9;
            sonicPlaceholder.position.y = 0.35 + Math.abs(Math.sin(fase)) * 0.07;
        } else {
            sonicPartes.pivBracoEsq.rotation.x = 0;
            sonicPartes.pivBracoDir.rotation.x = 0;
            sonicPartes.pivPernaEsq.rotation.x = 0;
            sonicPartes.pivPernaDir.rotation.x = 0;
            sonicPlaceholder.position.y = 0.35;
        }
    }


    // --- Sem. 4: Movimento do Sonic com WASD (bloqueado em câmara livre) ---
    if (sonicPlaceholder && !modoCamaraLivre) {
        var vel = 8 * delta;
        var movX = 0, movZ = 0;
        // Ajuste side-scroll: inverter W/S no modo ortográfico
        if (modoCamara === 'ortografica') {
            if (teclasPremidas.w) movZ += vel;  // esquerda no ecrã
            if (teclasPremidas.s) movZ -= vel;  // direita no ecrã
        } else {
            if (teclasPremidas.w) movZ -= vel;
            if (teclasPremidas.s) movZ += vel;
        }
        if (teclasPremidas.a) movX -= vel;
        if (teclasPremidas.d) movX += vel;

        var estaAMover = (movX !== 0 || movZ !== 0) && !modoBola;
        if (estaAMover !== sonicEmMovimento) {
            sonicEmMovimento = estaAMover;
            tocarAnimacaoSonic(estaAMover ? 'run' : 'idle');
        }

        if (movX !== 0 || movZ !== 0) {
            var nx = Math.max(-5, Math.min(5, sonicPlaceholder.position.x + movX));
            var nz = Math.max(-86, Math.min(40, sonicPlaceholder.position.z + movZ));

            sonicPlaceholder.position.x = nx;
            sonicPlaceholder.position.z = nz;

            if (sonicBola) {
                sonicBola.position.x = nx;
                sonicBola.position.z = nz;
                var raio = sonicBola.userData.raio || 0.7;
                sonicBola.position.y = 0.35 + raio;

                if (modoBola) {
                    // Rotação num eixo só (Z) para evitar gimbal lock
                    var velocidadeRot = Math.sqrt(movX * movX + movZ * movZ);
                    sonicBola.rotation.z += velocidadeRot * 5;
                } else {
                    sonicPlaceholder.rotation.y = Math.atan2(movX, movZ);
                }
            } else {
                sonicPlaceholder.rotation.y = Math.atan2(movX, movZ);
            }
        }
    }

    for (var i = 0; i < aneisDecorativos.length; i++) {
        aneisDecorativos[i].rotateY(delta * 2.5);
    }

    for (var n = 0; n < nuvens.length; n++) {
        if (modoCamara === 'ortografica') {
            // Side-scroll: nuvens movem-se em Z (horizontal no ecrã), da direita para a esquerda
            nuvens[n].position.z += delta * (0.4 + n * 0.08);
            if (nuvens[n].position.z > 50) {
                nuvens[n].position.z = -50;
            }
        } else {
            // Modo 3D normal
            nuvens[n].position.x += delta * (0.4 + n * 0.08);
            if (nuvens[n].position.x > 40) {
                nuvens[n].position.x = -40;
            }
        }
    }

    for (var p = 0; p < palmeiras.length; p++) {
        var palm = palmeiras[p];
        for (var ch = 0; ch < palm.children.length; ch++) {
            var filho = palm.children[ch];
            if (filho.userData.anguloBase !== undefined) {
                filho.rotation.x = filho.userData.anguloBase +
                    Math.sin(tempo * 1.2 + filho.userData.fase) * 0.03;
            }
        }
    }

    // --- Sem. 5: Animação dos barcos (órbita circular à volta das ilhas) ---
    for (var bi = 0; bi < barcos.length; bi++) {
        var b = barcos[bi];
        var ud = b.userData;
        var ang = tempo * ud.vel + ud.fase;
        b.position.x = ud.cx + Math.cos(ang) * ud.raio;
        b.position.z = ud.cz + Math.sin(ang) * ud.raio;
        b.position.y = -2.9 + Math.sin(tempo * 0.8 + ud.fase) * 0.15;
        // Proa apontada na direção tangente do movimento
        b.rotation.y = -ang;
        b.rotation.z = Math.sin(tempo * 0.8 + ud.fase) * 0.04;
    }

    // --- Sem. 5: Animação das gaivotas (trajetória circular + asas a bater) ---
    for (var gv = 0; gv < gaivotas.length; gv++) {
        var gaiv = gaivotas[gv];
        var ud = gaiv.userData;
        var ang = tempo * ud.vel + ud.fase;
        gaiv.position.set(
            Math.cos(ang) * ud.raio,
            ud.altura + Math.sin(tempo * 0.6 + ud.fase) * 0.5,
            Math.sin(ang) * ud.raio - 20
        );
        // Orientar gaivota na direção do movimento (tangente)
        gaiv.rotation.y = -ang + Math.PI / 2;
        // Bater asas
        var batida = Math.sin(tempo * 6 + ud.fase) * 0.6;
        gaiv.children[0].rotation.z =  batida;
        gaiv.children[1].rotation.z = -batida;
    }

    for (var vg = 0; vg < vegetacao.length; vg++) {
        var veg = vegetacao[vg];
        if (veg.tipo === 'ramificada' || veg.tipo === 'arbusto') {
            var filhos = veg.grupo.children;
            for (var fc = 0; fc < filhos.length; fc++) {
                if (filhos[fc].userData.eFolha) {
                    filhos[fc].rotation.z += Math.sin(tempo * 1.5 + filhos[fc].userData.fase) * 0.001;
                }
            }
        }
    }

    // --- Animação tufos de relva: brisa suave + reação à passagem do Sonic ---
    if (tufosRelva.length > 0) {
        var posSonicTufo = sonicPlaceholder ? sonicPlaceholder.position : null;
        var raioSonicRelva = 2.8;
        for (var tr = 0; tr < tufosRelva.length; tr++) {
            var tufo = tufosRelva[tr];
            // Brisa base (oscilação suave, fase diferente por tufo)
            var brisaX = Math.sin(tempo * 1.8 + tufo.userData.faseBrisa) * 0.07;
            var brisaZ = Math.cos(tempo * 1.3 + tufo.userData.faseBrisa * 0.7) * 0.04;

            // Reação à proximidade do Sonic: inclina para longe dele
            if (posSonicTufo) {
                var tdx = tufo.position.x - posSonicTufo.x;
                var tdz = tufo.position.z - posSonicTufo.z;
                var td2 = tdx * tdx + tdz * tdz;
                if (td2 < raioSonicRelva * raioSonicRelva) {
                    var tdist = Math.sqrt(td2) + 0.001;
                    var forca = (1.0 - tdist / raioSonicRelva) * 0.55;
                    brisaX += (tdx / tdist) * forca;
                    brisaZ += (tdz / tdist) * forca;
                } else {
                    // Amortece de volta ao neutro quando Sonic se afasta
                    tufo.rotation.x *= 0.88;
                    tufo.rotation.z *= 0.88;
                }
            }

            tufo.rotation.x = brisaX;
            tufo.rotation.z = brisaZ;
        }
    }

    // Animação de ondas do oceano (ondulação direcional)
    if (oceano) {
        var posOceano = oceano.geometry.attributes.position;
        for (var wo = 0; wo < posOceano.count; wo++) {
            var ox = posOceano.getX(wo);
            var oy = posOceano.getY(wo);
            var distCentro = Math.sqrt(ox * ox + oy * oy);
            var ondaRadial = Math.sin(distCentro * 0.04 - tempo * 1.2) * 0.5;
            var ondaDirecional = Math.sin(ox * 0.06 + tempo * 0.9) * 0.4;
            var ondaDetalhe = Math.sin(oy * 0.12 + tempo * 1.6) * 0.15;
            var fatorDist = Math.min(1.0, distCentro / 60);
            posOceano.setZ(wo, (ondaRadial + ondaDirecional + ondaDetalhe) * (0.3 + fatorDist * 0.7));
        }
        posOceano.needsUpdate = true;
        // Passo 1: computeVertexNormals() removido — era o maior bottleneck CPU (14.641 vértices/frame)
    }

    // Ondas de praia removidas

    if (modoCamara === 'perspetiva') {
        var alvoSeguir = (modoBola && sonicBola) ? sonicBola : sonicPlaceholder;
        if (modoSeguirSonic && alvoSeguir) {
            var sp = alvoSeguir.position;
            _vAlvoSeguir.set(sp.x, sp.y + 6, sp.z + 14);
            camaraPerspetiva.position.lerp(_vAlvoSeguir, 0.08);
            camaraPerspetiva.lookAt(sp.x, sp.y + 1, sp.z);
        }
    }

    renderer.render(cena, cameraAtiva);
    requestAnimationFrame(loop);
}

// --- Sem. 0/1 + Sem. 2: Inicialização ---
function Start() {
    atualizarDimensoes(); // ajusta câmara ao tamanho real da janela na inicialização
    criarTerreno();
    criarTufosRelvaNasPlataformas();
    criarSkyboxRetro();
    criarIlhasDistantes();
    criarBarco();
    criarGaivotas();
    criarLuzes();
    criarLooping();
    criarVegetacao();
    criarAneis();
    criarElementosNivel();
    criarSonicPlaceholder();
    renderer.render(cena, camaraPerspetiva);
    requestAnimationFrame(loop);
}
