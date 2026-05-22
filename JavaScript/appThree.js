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
    canvas.width = 256; canvas.height = 256;
    var ctx = canvas.getContext('2d');
    // Base verde
    ctx.fillStyle = '#39b54a';
    ctx.fillRect(0, 0, 256, 256);
    // Variação de tons
    var tons = ['#2d8f2d', '#4ab34a', '#228B22', '#32a843'];
    for (var i = 0; i < 800; i++) {
        ctx.fillStyle = tons[Math.floor(Math.random() * tons.length)];
        var x = Math.random() * 256, y = Math.random() * 256;
        ctx.fillRect(x, y, 2 + Math.random() * 4, 1 + Math.random() * 3);
    }
    var tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
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
    // Espaço 2 (z-20 → z-30): loop (a colocar)
    // No fim da Plat 3, rampa vira à direita para a Plat 4 onde está a placa final.

    // --- Plataforma 1: Spawn → primeiro espaço ---
    criarSegmentoTerreno(0, 27.5, 12, 25, 4, 0);   // z=+40 a z=+15

    // --- Plataforma 2: segundo segmento ---
    criarSegmentoTerreno(0, -7.5, 12, 25, 4, 0);   // z=+5  a z=-20

    // --- Plataforma 3: terceiro segmento ---
    criarSegmentoTerreno(0, -40, 12, 20, 4, 0);    // z=-30 a z=-50

    // --- Plataforma 4: paralela às outras, mais comprida, continuação do nível ---
    // Espaço loop: z=-20 a z=-30 (vazio — o loop será colocado aqui)
    // Plat 4 continua após o loop em z=-55, mesma largura, mais comprida
    criarSegmentoTerreno(0, -67.5, 12, 25, 4, 0);  // z=-55 a z=-80

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

    for (var n = 0; n < 14; n++) {
        var grupoNuvem = new THREE.Group();
        var posX = -40 + n * 7;
        var posY = 20 + (n % 4) * 1.8;
        // Espalhar nuvens em Z para serem visíveis na vista ortográfica lateral
        var posZ = -35 + (n * 5) % 70;

        for (var parte = 0; parte < 3; parte++) {
            var geometriaNuvem = new THREE.SphereGeometry(1.2 + parte * 0.25, 16, 8);
            var esferaNuvem = new THREE.Mesh(geometriaNuvem, materialNuvem);
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
        [3.6,   90, 5, 0.8],
        [4.5,  100, 7, 1.3],
        [5.4,   95, 6, 1.1]
    ];

    // Ilhas extra posicionadas para serem visíveis na vista ortográfica (x<0, |z|<28)
    // formato: [x, z, raio, altura] (override)
    var extras = [
        [-65,  -18, 7, 1.3],
        [-70,    0, 6, 1.2],
        [-75,   18, 6, 1.1],
        // Ilhas à direita do cenário (X positivo)
        [ 55,  -15, 7, 1.4],
        [ 60,   12, 6, 1.2],
        [ 50,    0, 5, 1.0]
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
    // Configuração de cada barco: centro X, centro Z, raio, vel angular, fase, cor da vela
    // Órbitas em águas abertas entre o nível e as ilhas distantes (sem colisões)
    var configs = [
        { cx: -38, cz: -22, raio: 9, vel: 0.18, fase: 0,        corVela: 0xfafafa },
        { cx: -42, cz:  20, raio: 9, vel: 0.13, fase: Math.PI,  corVela: 0xffe28a }
    ];

    for (var b = 0; b < configs.length; b++) {
        var cfg = configs[b];
        var barco = new THREE.Group();

        // Casco
        var casco = new THREE.Mesh(
            new THREE.BoxGeometry(4, 1.2, 1.6),
            new THREE.MeshBasicMaterial({ color: 0x8b4a2b })
        );
        barco.add(casco);

        // Convés
        var conves = new THREE.Mesh(
            new THREE.BoxGeometry(3.5, 0.2, 1.4),
            new THREE.MeshBasicMaterial({ color: 0xd4a574 })
        );
        conves.position.y = 0.7;
        barco.add(conves);

        // Mastro
        var mastro = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 4, 6),
            new THREE.MeshBasicMaterial({ color: 0x4a2a14 })
        );
        mastro.position.set(0, 2.7, 0);
        barco.add(mastro);

        // Vela (plano com side DoubleSide)
        var vela = new THREE.Mesh(
            new THREE.PlaneGeometry(2.2, 3.0),
            new THREE.MeshBasicMaterial({ color: cfg.corVela, side: THREE.DoubleSide })
        );
        vela.position.set(0.05, 3.0, 0);
        vela.rotation.y = Math.PI / 2;
        barco.add(vela);

        // Bandeira no topo do mastro
        var bandeira = new THREE.Mesh(
            new THREE.PlaneGeometry(0.6, 0.35),
            new THREE.MeshBasicMaterial({ color: 0xcc1111, side: THREE.DoubleSide })
        );
        bandeira.position.set(0.35, 4.7, 0);
        bandeira.rotation.y = Math.PI / 2;
        barco.add(bandeira);

        barco.userData = {
            cx: cfg.cx,
            cz: cfg.cz,
            raio: cfg.raio,
            vel: cfg.vel,
            fase: cfg.fase
        };
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

// --- Sem. 2: Looping — placeholder (a implementar futuramente) ---
function criarLooping() {
    // Reservado para o looping completo
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
        cilindro.castShadow = true;
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
        coresFolha: [0x2d8f2d, 0x39b54a, 0x228B22, 0x4ab34a]
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
        [-33,1.05],[-42,1.0],[-48,0.9],
        // Plat4
        [-58,1.0],[-66,1.1],[-72,0.9],[-77,1.0]
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
        [-36,0.8],[-44,1.0],
        // Plat4
        [-61,0.9],[-69,1.0],[-75,0.8]
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
        [0,1.5,-18],[0,1.5,-22],[0,1.5,-26],
        [-2,1.5,-34],[0,1.8,-34],[2,1.5,-34]
    ];

    var materialBrilho = new THREE.MeshBasicMaterial({ color: 0xffee88 });
    for (var i = 0; i < pos.length; i++) {
        var grupoAnel = new THREE.Group();
        var anel = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.13, 16, 48), materialDourado);
        // Passo 2: castShadow removido — anéis pequenos, sombra impercetível
        grupoAnel.add(anel);
        grupoAnel.add(new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 8, 32), materialBrilho));
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

// Ponte: série de BoxGeometry (tábuas) com CylinderGeometry (cordas)
function criarPonte(x, y, z, comprimento, numTabuas) {
    var grupo = new THREE.Group();
    numTabuas = numTabuas || 8;

    var materialTabua = new THREE.MeshStandardMaterial({ color: 0x8B6B3D, roughness: 0.8 });
    var materialCorda = new THREE.MeshStandardMaterial({ color: 0x5A4020, roughness: 0.9 });

    var espacamento = comprimento / numTabuas;

    for (var cx = -1; cx <= 1; cx += 2) {
        var corda = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, comprimento, 4), materialCorda);
        corda.rotation.x = Math.PI / 2;
        corda.position.set(cx * 0.7, 0, comprimento / 2);
        grupo.add(corda);
    }

    for (var i = 0; i < numTabuas; i++) {
        var tabua = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 0.12, espacamento * 0.85),
            materialTabua
        );
        tabua.position.set(0, -0.06, i * espacamento + espacamento / 2);
        tabua.receiveShadow = true;
        tabua.castShadow = true;
        grupo.add(tabua);
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
    var grupo = new THREE.Group();
    numFlores = numFlores || 5;

    var coresPetalas = [0xff69b4, 0xffdd44, 0xff4444, 0xffffff, 0xff88cc];
    var materialCaule = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.7 });

    for (var f = 0; f < numFlores; f++) {
        var grupoFlor = new THREE.Group();

        var caule = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.03, 0.4, 4),
            materialCaule
        );
        caule.position.y = 0.2;
        grupoFlor.add(caule);

        var corFlor = coresPetalas[f % coresPetalas.length];
        var materialPetala = new THREE.MeshBasicMaterial({ color: corFlor });
        var materialCentro = new THREE.MeshBasicMaterial({ color: 0xffee00 });

        var centro = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), materialCentro);
        centro.position.y = 0.42;
        grupoFlor.add(centro);

        for (var p = 0; p < 5; p++) {
            var petala = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 6, 4),
                materialPetala
            );
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

    // ── Espaço 1 (z=+15 a z=+5): ponte (a colocar futuramente) ──

    // ── Plataforma 2 (z=+5 a z=-20) ─────────────────────────────
    // Checkpoint 1: início da plataforma 2
    criarCheckpoint(0, y, 4);
    // Obstáculo 2: Picos — passar pelo lado ESQUERDO
    criarPicos(3, y, -4, { largura: 6, numPicos: 8 });
    // Obstáculo 3: Picos — passar pelo lado DIREITO
    criarPicos(-3, y, -14, { largura: 6, numPicos: 8 });
    // Checkpoint 2: fim da plataforma 2
    criarCheckpoint(0, y, -19);

    // ── Espaço 2 (z=-20 a z=-30): loop (a colocar futuramente) ──

    // ── Plataforma 3 (z=-30 a z=-50) ────────────────────────────
    // Obstáculo 4: Picos com mola centrada
    criarPicos(0, y, -37, { largura: 10, numPicos: 14 });
    criarMola(0, y, -37);

    // ── Plataforma 4 (z=-55 a z=-80): paralela, mais comprida ────
    // Placa final no extremo da plataforma 4
    criarPlacaFinal(0, y, -78);

    // Flores simétricas nas plataformas 1-3
    var floresSim = [
        [4,39,5],[4,33,4],[4,26,5],[4,20,4],[4,17,3],
        [4,3,4],[4,-4,3],[4,-16,4],
        [4,-32,4],[4,-42,4],[4,-48,3]
    ];
    for (var i = 0; i < floresSim.length; i++) {
        var f = floresSim[i];
        criarFloresChao(-f[0], y, f[1], f[2]);
        criarFloresChao(f[0], y, f[1], f[2]);
    }
    // Flores na plataforma 4
    criarFloresChao(-4, y, -60, 4);
    criarFloresChao(4, y, -60, 4);
    criarFloresChao(-4, y, -70, 3);
    criarFloresChao(4, y, -70, 3);
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

    atualizarDimensoes();

    // --- Sem. 5: Atualizar câmara livre (WASD + Shift/Ctrl + arrastar rato) ---
    if (modoCamaraLivre) {
        var velCam = (teclasPremidas.shift && teclasPremidas.control ? 40 : 20) * delta;
        var cosP = Math.cos(camLivrePitch);
        var forward = new THREE.Vector3(
            -Math.sin(camLivreYaw) * cosP,
             Math.sin(camLivrePitch),
            -Math.cos(camLivreYaw) * cosP
        );
        var right = new THREE.Vector3(Math.cos(camLivreYaw), 0, -Math.sin(camLivreYaw));

        var deslocamento = new THREE.Vector3();
        if (teclasPremidas.w) deslocamento.addScaledVector(forward,  velCam);
        if (teclasPremidas.s) deslocamento.addScaledVector(forward, -velCam);
        if (teclasPremidas.a) deslocamento.addScaledVector(right,   -velCam);
        if (teclasPremidas.d) deslocamento.addScaledVector(right,    velCam);
        camaraPerspetiva.position.add(deslocamento);
        camaraPerspetiva.lookAt(camaraPerspetiva.position.clone().add(forward));
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
            var nz = Math.max(-80, Math.min(40, sonicPlaceholder.position.z + movZ));

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
        b.position.y = -0.5 + Math.sin(tempo * 0.8 + ud.fase) * 0.15;
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
            var alvoPos = new THREE.Vector3(sp.x, sp.y + 6, sp.z + 14);
            camaraPerspetiva.position.lerp(alvoPos, 0.08);
            camaraPerspetiva.lookAt(sp.x, sp.y + 1, sp.z);
        }
    }

    renderer.render(cena, cameraAtiva);
    requestAnimationFrame(loop);
}

// --- Sem. 0/1 + Sem. 2: Inicialização ---
function Start() {
    criarTerreno();
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
