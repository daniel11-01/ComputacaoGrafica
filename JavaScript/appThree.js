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
var aneisDecorativos = [], grupoLooping, vegetacao = [], palmeiras = [];
var sonicPlaceholder, sonicBola, modoBola = false, oceano, espumaOndas = [];

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

// --- Sem. 4: Estado do teclado WASD ---
var teclasPremidas = { w: false, a: false, s: false, d: false };

// --- Sem. 4: Modo câmara follow ---
var modoSeguirSonic = false;

// --- Presets de câmara (teclas 1-8) ---
var vistaAtual = 'Vista geral (3/4)';

var presetsCamara = {
    '1': { pos: [25, 12, 10],   alvo: [0, 3, 0],    nome: 'Vista geral (3/4)' },
    '2': { pos: [30, 8, 0],     alvo: [0, 4, 0],    nome: 'Lado direito' },
    '3': { pos: [-30, 8, 0],    alvo: [0, 4, 0],    nome: 'Lado esquerdo' },
    '4': { pos: [0, 40, 1],     alvo: [0, 0, 0],    nome: 'Topo (vista aérea)' },
    '5': { pos: [20, 8, 30],    alvo: [0, 2, 30],   nome: 'Início do nível' },
    '6': { pos: [15, 10, -10],  alvo: [0, 5, -8],   nome: 'Vista do loop' },
    '7': { pos: [20, 6, -28],   alvo: [0, 2, -30],  nome: 'Final do nível' },
    '8': { pos: [0, 5, 45],     alvo: [0, 3, 0],    nome: 'Frente (side-scroll)' }
};

var labelVista = document.createElement('div');
labelVista.style.cssText = 'position:fixed;top:10px;left:10px;background:rgba(0,0,0,0.7);color:#fff;padding:8px 16px;font-family:monospace;font-size:14px;border-radius:6px;z-index:100;pointer-events:none;';
labelVista.textContent = 'Vista: Vista geral (3/4) — Teclas 1-8 para mudar, O/0 para alternar câmara';
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

function aplicarPresetCamara(tecla) {
    var preset = presetsCamara[tecla];
    if (!preset) return;
    // Sem. 4: desativar follow ao usar preset manual
    modoSeguirSonic = false;
    camaraPerspetiva.position.set(preset.pos[0], preset.pos[1], preset.pos[2]);
    camaraPerspetiva.lookAt(preset.alvo[0], preset.alvo[1], preset.alvo[2]);
    vistaAtual = preset.nome;
    atualizarLabelVista();
}

function atualizarLabelVista() {
    if (modoCamara === 'ortografica') {
        labelVista.textContent = 'Vista: Side-scroll ortográfica — Teclas O/0 para alternar câmara';
    } else {
        labelVista.textContent = 'Vista: ' + vistaAtual + ' — Teclas 1-8 para mudar, O/0 para alternar câmara';
    }
}

function alternarModoCamara() {
    if (modoCamara === 'perspetiva') {
        modoCamara = 'ortografica';
        cameraAtiva = camaraOrtografica;
    } else {
        modoCamara = 'perspetiva';
        cameraAtiva = camaraPerspetiva;
    }
    atualizarLabelVista();
}

document.addEventListener('keydown', function(evento) {
    var tecla = evento.key;
    if (presetsCamara[tecla]) {
        aplicarPresetCamara(tecla);
    } else if (tecla === 'o' || tecla === 'O' || tecla === '0') {
        alternarModoCamara();
    }
    // Sem. 4: ativar câmara follow
    if (tecla.toLowerCase() === 'c') {
        modoSeguirSonic = true;
        vistaAtual = 'Follow Sonic';
        labelVista.textContent = 'Vista: Follow Sonic — WASD para mover | 1-8 para presets';
    }
    // Sem. 4: registar teclas WASD premidas
    var teclaLower = tecla.toLowerCase();
    if (teclasPremidas.hasOwnProperty(teclaLower)) teclasPremidas[teclaLower] = true;
    // Sem. 4: alternar modo bola (Espaço)
    if (evento.code === 'Space' && sonicPlaceholder && sonicBola) {
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

    // === Nível linear PLANO ao longo do eixo Z ===
    // Tudo ao mesmo nível y=0 para criar uma superfície contínua.
    // z=+37 (início) → z=-37 (fim)
    // Loop entry ramp: z≈+3 → z=-1, Loop exit ramp: z=-15 → z=-19

    // Plataforma única contínua ANTES do loop (z=+37 a z=-2)
    criarSegmentoTerreno(0, 17.5, 12, 39, 4, 0);

    // Plataforma única contínua DEPOIS do loop (z=-15 a z=-37)
    criarSegmentoTerreno(0, -26, 12, 22, 4, 0);

    // Plataformas laterais decorativas (simétricas, ao mesmo nível)
    var platLat = [[15, 20], [-22, 16]];
    for (var pl = 0; pl < platLat.length; pl++) {
        criarSegmentoTerreno(-12, platLat[pl][0], 6, platLat[pl][1], 3, 0);
        criarSegmentoTerreno(12, platLat[pl][0], 6, platLat[pl][1], 3, 0);
    }

    // === PRAIA: Areia à volta das plataformas ===
    // Sem. 3: textura procedural da areia aplicada via map
    var materialAreia = new THREE.MeshStandardMaterial({ map: criarTexturaAreia(), color: 0xf2d98b, roughness: 0.9 });
    var areia = new THREE.Mesh(new THREE.PlaneGeometry(70, 100), materialAreia);
    areia.rotation.x = -Math.PI / 2;
    areia.position.set(0, -2.8, 0);
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
    oceano = new THREE.Mesh(new THREE.PlaneGeometry(300, 300, 120, 120), materialOceano);
    oceano.rotation.x = -Math.PI / 2;
    oceano.position.set(0, -3.2, 0);
    oceano.receiveShadow = true;
    cena.add(oceano);

    // === ONDAS DE PRAIA: faixas que avançam e recuam ===
    var materialOndaBranca = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
    var materialOndaClara = new THREE.MeshBasicMaterial({ color: 0x6ec8e8, transparent: true, opacity: 0.5, side: THREE.DoubleSide });

    // 4 lados da praia: +X, -X, +Z, -Z
    var ladosPraia = [
        { eixo: 'x', sinal: 1, limAreia: 35, comp: 100, dir: 'z' },
        { eixo: 'x', sinal: -1, limAreia: -35, comp: 100, dir: 'z' },
        { eixo: 'z', sinal: 1, limAreia: 50, comp: 70, dir: 'x' },
        { eixo: 'z', sinal: -1, limAreia: -50, comp: 70, dir: 'x' }
    ];

    for (var lado = 0; lado < ladosPraia.length; lado++) {
        var l = ladosPraia[lado];
        for (var w = 0; w < 3; w++) {
            var mat = w === 0 ? materialOndaBranca : materialOndaClara;
            var larguraOnda = 1.2 - w * 0.3;

            var ondaGeo;
            if (l.dir === 'z') {
                ondaGeo = new THREE.PlaneGeometry(larguraOnda, l.comp, 1, 30);
            } else {
                ondaGeo = new THREE.PlaneGeometry(l.comp, larguraOnda, 30, 1);
            }

            var ondaMesh = new THREE.Mesh(ondaGeo, mat.clone());
            ondaMesh.rotation.x = -Math.PI / 2;
            ondaMesh.position.y = -2.65;

            var dist = l.limAreia + l.sinal * (3 + w * 2.5);
            if (l.eixo === 'x') {
                ondaMesh.position.x = dist;
                ondaMesh.position.z = 0;
            } else {
                ondaMesh.position.z = dist;
                ondaMesh.position.x = 0;
            }

            ondaMesh.userData.ladoPraia = l;
            ondaMesh.userData.indicOnda = w;
            ondaMesh.userData.distBase = 3 + w * 2.5;
            ondaMesh.userData.fase = w * 2.1 + lado * 1.5;

            espumaOndas.push(ondaMesh);
            cena.add(ondaMesh);
        }
    }
}

// --- Sem. 0/1: Skybox retro (sol, montanhas, nuvens animadas) ---
function criarSkyboxRetro() {
    cena.background = new THREE.Color(0x6ec6ff);
    cena.fog = new THREE.Fog(0x6ec6ff, 80, 160);

    var geometriaSol = new THREE.CircleGeometry(3, 48);
    var materialSol = new THREE.MeshBasicMaterial({ color: 0xffdc4a });
    sol = new THREE.Mesh(geometriaSol, materialSol);
    sol.position.set(-20, 16, -40);
    cena.add(sol);

    var materialMontanhaVerde = new THREE.MeshBasicMaterial({ color: 0x39b54a });
    var materialMontanhaEscura = new THREE.MeshBasicMaterial({ color: 0x16853a });

    for (var i = 0; i < 12; i++) {
        var geometriaMontanha = new THREE.ConeGeometry(6, 10 + (i % 3) * 2, 3);
        var materialMontanha = i % 2 === 0 ? materialMontanhaVerde : materialMontanhaEscura;
        var montanha = new THREE.Mesh(geometriaMontanha, materialMontanha);

        montanha.position.set(-35 + i * 7, 3, -42);
        montanha.rotation.y = Math.PI / 4;
        cena.add(montanha);
    }

    var materialNuvem = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (var n = 0; n < 7; n++) {
        var grupoNuvem = new THREE.Group();
        var posX = -30 + n * 10;
        var posY = 11 + (n % 3) * 2;
        var posZ = -30 + (n % 2) * 5;

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

// --- Sem. 2: Looping (CatmullRomCurve3 + TubeGeometry + suportes + rampas) ---
function criarLooping() {
    grupoLooping = new THREE.Group();

    var pontosCurva = [];
    var raio = 6;
    var segmentos = 64;

    for (var i = 0; i <= segmentos; i++) {
        var angulo = (i / segmentos) * Math.PI * 2;
        var x = 0;
        var y = raio + Math.sin(angulo) * raio;
        var z = Math.cos(angulo) * raio;
        pontosCurva.push(new THREE.Vector3(x, y, z));
    }

    var curva = new THREE.CatmullRomCurve3(pontosCurva, true);

    // Sem. 3: textura de madeira via TextureLoader (URL pública CC0)
    var texturaPista = carregadorTexturas.load('https://threejs.org/examples/textures/hardwood2_diffuse.jpg');
    texturaPista.wrapS = texturaPista.wrapT = THREE.RepeatWrapping;
    texturaPista.repeat.set(1, 8);
    texturaPista.colorSpace = THREE.SRGBColorSpace;
    var materialPista = new THREE.MeshStandardMaterial({ map: texturaPista, color: 0x8B4513, roughness: 0.6, metalness: 0.1, side: THREE.DoubleSide });

    var geometriaTubo = new THREE.TubeGeometry(curva, 128, 0.8, 12, true);
    var tubo = new THREE.Mesh(geometriaTubo, materialPista);
    tubo.castShadow = true;
    tubo.receiveShadow = true;
    grupoLooping.add(tubo);

    var materialGrade = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.7, roughness: 0.3 });

    var numSuportes = 16;
    for (var s = 0; s < numSuportes; s++) {
        var t = s / numSuportes;
        var ponto = curva.getPointAt(t);
        var tangente = curva.getTangentAt(t);

        var suporte = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8),
            materialGrade
        );
        suporte.position.copy(ponto);

        var eixo = new THREE.Vector3(0, 1, 0);
        var quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(eixo, tangente.normalize());
        suporte.quaternion.copy(quaternion);
        suporte.castShadow = true;
        grupoLooping.add(suporte);
    }

    var materialEntrada = new THREE.MeshStandardMaterial({ color: 0x39b54a, roughness: 0.5 });

    // Rampas de entrada e saída
    var rampasData = [{z: 9, rot: -0.04}, {z: -9, rot: 0.04}];
    for (var r = 0; r < rampasData.length; r++) {
        var rampa = new THREE.Mesh(new THREE.BoxGeometry(12, 0.5, 14), materialEntrada);
        rampa.position.set(0, 0.15, rampasData[r].z);
        rampa.rotation.x = rampasData[r].rot;
        rampa.receiveShadow = true;
        grupoLooping.add(rampa);
    }

    grupoLooping.position.set(0, 0, -8);
    cena.add(grupoLooping);
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
        var materialFolha = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.6, side: THREE.DoubleSide });
        var tamanho = tamanhoFolha * rng.range(0.7, 1.3);
        var baseRotY = rng.range(0, Math.PI * 2);

        for (var cp = 0; cp < 2; cp++) {
            var plano = new THREE.Mesh(new THREE.PlaneGeometry(tamanho, tamanho, 3, 3), materialFolha);
            deformarFolha(plano, rng);
            plano.position.copy(posicao);
            plano.rotation.set(rng.range(-0.3, 0.3), baseRotY + cp * Math.PI / 2, 0);
            plano.castShadow = true;
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

// TIPO A: Palmeira Tropical (tronco curvo + folhas cross-plane + cocos)
function criarPalmeira(posX, posZ, escala) {
    var grupo = new THREE.Group();
    escala = escala || 1.0;
    var seed = Math.floor(posX * 100 + posZ * 7);
    var rng = criarRNG(seed);

    var materialTronco = new THREE.MeshStandardMaterial({ map: texturaCascaPartilhada, color: 0x8B5E3C, roughness: 0.85 });
    var materialAnel = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.95 });

    var alturaTronco = 6 + rng.range(0, 2);
    var numSeccoes = 12;
    var alturaSeccao = alturaTronco / numSeccoes;
    var posAtual = new THREE.Vector3(0, 0, 0);
    var dirAtual = new THREE.Vector3(0, 1, 0);
    var inclinacao = rng.range(-0.08, 0.08);

    var pontosTopo = [];

    for (var i = 0; i < numSeccoes; i++) {
        var progresso = i / numSeccoes;
        var raioBase = 0.35 - progresso * 0.2;
        var raioTopo = 0.32 - progresso * 0.2;
        if (raioBase < 0.1) raioBase = 0.1;
        if (raioTopo < 0.08) raioTopo = 0.08;

        dirAtual.x += rng.range(-0.04, 0.04) + inclinacao * 0.01;
        dirAtual.z += rng.range(-0.04, 0.04);
        dirAtual.normalize();

        var proxPos = posAtual.clone().add(dirAtual.clone().multiplyScalar(alturaSeccao));
        var centro = posAtual.clone().add(proxPos).multiplyScalar(0.5);
        var diff = proxPos.clone().sub(posAtual);

        var segmento = new THREE.Mesh(
            new THREE.CylinderGeometry(raioTopo, raioBase, diff.length(), 8),
            materialTronco
        );
        segmento.position.copy(centro);
        var quat = new THREE.Quaternion();
        quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), diff.clone().normalize());
        segmento.quaternion.copy(quat);
        segmento.castShadow = true;
        grupo.add(segmento);

        if (i > 0 && i % 2 === 0) {
            var anel = new THREE.Mesh(
                new THREE.TorusGeometry(raioBase + 0.03, 0.025, 6, 12),
                materialAnel
            );
            anel.position.copy(posAtual);
            var torusQuat = new THREE.Quaternion();
            torusQuat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dirAtual.clone());
            anel.quaternion.copy(torusQuat);
            grupo.add(anel);
        }

        posAtual = proxPos;
        pontosTopo.push(posAtual.clone());
    }

    var topoTronco = posAtual.clone();

    var materialFolha = new THREE.MeshStandardMaterial({ color: 0x2d8f2d, roughness: 0.5, side: THREE.DoubleSide });
    var materialFolhaClara = new THREE.MeshStandardMaterial({ color: 0x4ab34a, roughness: 0.5, side: THREE.DoubleSide });

    var numFolhas = 7;
    for (var f = 0; f < numFolhas; f++) {
        var anguloFolha = (f / numFolhas) * Math.PI * 2 + rng.range(-0.2, 0.2);
        var matFolha = f % 2 === 0 ? materialFolha : materialFolhaClara;

        var grupoFolha = new THREE.Group();

        for (var p = 0; p < 2; p++) {
            var folha = new THREE.Mesh(
                new THREE.PlaneGeometry(0.7, 3.5, 2, 8),
                matFolha
            );

            var posFolha = folha.geometry.attributes.position;
            for (var v = 0; v < posFolha.count; v++) {
                var yLocal = posFolha.getY(v);
                var xLocal = posFolha.getX(v);
                var fator = (yLocal + 1.75) / 3.5;
                var curva = fator * fator * 1.8;
                posFolha.setZ(v, posFolha.getZ(v) - curva);
                var escalaFolhaX = 1.0 - fator * 0.65;
                posFolha.setX(v, xLocal * escalaFolhaX);
                var onda = Math.sin(fator * Math.PI * 3) * 0.06;
                posFolha.setX(v, posFolha.getX(v) + onda);
            }
            posFolha.needsUpdate = true;
            folha.geometry.computeVertexNormals();

            folha.rotation.y = p * Math.PI / 3;
            folha.castShadow = true;
            grupoFolha.add(folha);
        }

        grupoFolha.position.copy(topoTronco);
        grupoFolha.rotation.y = anguloFolha;
        grupoFolha.rotation.x = -0.35 - rng.range(0, 0.25);
        grupoFolha.userData.anguloBase = grupoFolha.rotation.x;
        grupoFolha.userData.fase = f * 0.9;
        grupo.add(grupoFolha);
    }

    var materialCoco = new THREE.MeshStandardMaterial({ color: 0x5C3317, roughness: 0.7 });
    var numCocos = 2 + Math.floor(rng.next() * 2);
    for (var c = 0; c < numCocos; c++) {
        var anguloCoco = (c / numCocos) * Math.PI * 2 + rng.range(0, 0.5);
        var coco = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), materialCoco);
        coco.position.set(
            topoTronco.x + Math.cos(anguloCoco) * 0.3,
            topoTronco.y - 0.3,
            topoTronco.z + Math.sin(anguloCoco) * 0.3
        );
        coco.castShadow = true;
        grupo.add(coco);
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
    // Dados: [z, escala] — colocadas simetricamente a ±x
    var palmZ = [[34,1.1],[24,1.0],[12,0.9],[-18,1.0],[-30,1.05]];
    for (var i = 0; i < palmZ.length; i++) {
        criarPalmeira(-5, palmZ[i][0], palmZ[i][1]);
        criarPalmeira(5, palmZ[i][0], palmZ[i][1]);
    }
    var arvZ = [[20,1.1],[10,1.0],[-18,1.0],[-26,0.9]];
    for (var j = 0; j < arvZ.length; j++) {
        criarArvoreRamificada(-12, arvZ[j][0], arvZ[j][1]);
        criarArvoreRamificada(12, arvZ[j][0], arvZ[j][1]);
    }
    var arbZ = [[36,1.0],[28,1.1],[18,0.9],[8,1.0],[-20,1.0],[-28,0.9],[-34,0.8]];
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
        anel.castShadow = true;
        grupoAnel.add(anel);
        grupoAnel.add(new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 8, 32), materialBrilho));
        grupoAnel.position.set(pos[i][0], pos[i][1], pos[i][2]);
        grupoAnel.rotation.y = Math.PI / 2;
        aneisDecorativos.push(grupoAnel);
        cena.add(grupoAnel);
    }
}

// --- Sem. 2 + Sem. 4: Modelo do Sonic (hierarquia THREE.Group) ---
function criarSonicPlaceholder() {
    sonicPlaceholder = new THREE.Group();

    // Materiais base
    var matAzul    = new THREE.MeshStandardMaterial({ color: 0x1a6bff, roughness: 0.45, metalness: 0.05 });
    var matAzulEsc = new THREE.MeshStandardMaterial({ color: 0x0d3fa6, roughness: 0.5,  metalness: 0.0  });
    var matPele    = new THREE.MeshStandardMaterial({ color: 0xf5c98a, roughness: 0.65, metalness: 0.0  });
    var matBranco  = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.55, metalness: 0.0  });
    var matPreto   = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.4,  metalness: 0.1  });
    var matVerm    = new THREE.MeshStandardMaterial({ color: 0xcc1111, roughness: 0.5,  metalness: 0.05 });
    var matSola    = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8,  metalness: 0.0  });
    // Materiais reutilizados da cena (mesmo estilo dos anéis decorativos)
    var matDourado = new THREE.MeshPhysicalMaterial({ color: 0xffcc33, metalness: 0.9, roughness: 0.12, reflectivity: 1.0, clearcoat: 0.3 });
    var matBrancoBrilho = new THREE.MeshPhysicalMaterial({ color: 0xf8f8f8, metalness: 0.0, roughness: 0.25, clearcoat: 0.5 });
    var matIris = new THREE.MeshStandardMaterial({ color: 0x228844, roughness: 0.3, metalness: 0.1 });

    function add(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; sonicPlaceholder.add(mesh); return mesh; }
    function addTo(grupo, mesh) { mesh.castShadow = true; mesh.receiveShadow = true; grupo.add(mesh); return mesh; }

    // === CORPO (menor, mais esguio) ===
    var corpo = new THREE.Mesh(new THREE.SphereGeometry(0.65, 32, 24), matAzul);
    corpo.scale.set(1.0, 1.25, 0.95); add(corpo);

    // Barriga muito reduzida
    var barriga = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), matPele);
    barriga.scale.set(0.85, 0.95, 0.40);
    barriga.position.set(0, -0.05, 0.50); add(barriga);

    // === CABEÇA — sonic_head.glb ===
    carregadorGLTF.load('assets/sonic_head.glb', function(gltf) {
        var cabecaGLB = gltf.scene;
        cabecaGLB.scale.setScalar(0.028);
        cabecaGLB.position.set(0.25, 0.30, 0);
        cabecaGLB.traverse(function(node) {
            if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
        });
        sonicPlaceholder.add(cabecaGLB);
    });

    // === BRAÇOS + LUVAS (nasce dentro do corpo para ligar visualmente) ===
    [-1, 1].forEach(function(l) {
        var gB = new THREE.Group();
        // Braço começa dentro do corpo (parte superior enterrada no corpo azul)
        var braco = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.09, 1.0, 12), matAzul);
        addTo(gB, braco);
        var punho = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.032, 10, 20), matBrancoBrilho);
        punho.rotation.x = Math.PI / 2;
        punho.position.y = -0.52; addTo(gB, punho);
        var luva = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), matBrancoBrilho);
        luva.scale.set(1.0, 0.9, 1.05);
        luva.position.y = -0.66; addTo(gB, luva);
        // Posicionar: x mais perto do corpo, y mais alto para enterrar topo do braço no corpo
        gB.position.set(l * 0.68, 0.18, 0.05);
        gB.rotation.z = l * 0.38;
        sonicPlaceholder.add(gB);
    });

    // === PERNAS (nascem dentro da base do corpo) ===
    [-1, 1].forEach(function(l) {
        // Perna longa — topo enterrado na base do corpo
        // Perna: comprimento 1.1, centro y=-1.25 → topo y=-0.70 (dentro corpo), fundo y=-1.80
        var perna = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.10, 1.10, 12), matPele);
        perna.position.set(l * 0.26, -1.25, 0.0); add(perna);
    });

    // === SAPATOS — sonic_sapatos.glb (já tem os 2 sapatos, carregar uma vez só) ===
    // Perna fundo: y=-1.25-0.55=-1.80 → sapatos centrados em y=-1.95
    // sonicPlaceholder.y=2.40 + (-1.95) = 0.45 → acima do chão (y=0.35)
    carregadorGLTF.load('assets/sonic_sapatos.glb', function(gltf) {
        var sapatos = gltf.scene;
        // Escalar X maior para afastar os sapatos simetricamente
        sapatos.scale.set(0.41, 0.24, 0.24);
        sapatos.position.set(0, -1.92, 0.15);
        sapatos.traverse(function(node) {
            if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
        });
        sonicPlaceholder.add(sapatos);
    });

    sonicPlaceholder.position.set(0, 2.40, 34);
    cena.add(sonicPlaceholder);

    // === BOLA — sonic_bola.glb (ativada com Espaço) ===
    sonicBola = new THREE.Group();
    sonicBola.visible = false;
    carregadorGLTF.load('assets/sonic_bola.glb', function(gltf) {
        var bola = gltf.scene;
        // Escala automática via bounding box
        var box = new THREE.Box3().setFromObject(bola);
        var size = new THREE.Vector3();
        box.getSize(size);
        var maxDim = Math.max(size.x, size.y, size.z);
        var escalaAlvo = 1.4 / maxDim;
        bola.scale.setScalar(escalaAlvo);
        // Corrigir orientação do GLB (roda de lado → corrigir eixo)
        bola.rotation.x = -Math.PI / 2;
        // Calcular raio real após escala para assentar no chão
        var raio = (size.y * escalaAlvo) / 2;
        sonicBola.userData.raio = raio;
        // Posicionar: terreno y=0.35 + raio
        sonicBola.position.set(sonicPlaceholder.position.x, 0.35 + raio, sonicPlaceholder.position.z);
        bola.traverse(function(node) {
            if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
        });
        sonicBola.add(bola);
    }, undefined, function(err) { console.error('[sonic_bola] erro:', err); });
    cena.add(sonicBola);
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
    base.castShadow = true;
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
    topo.castShadow = true;
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
    poste.castShadow = true;
    grupo.add(poste);

    var esfera = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), materialTopo);
    esfera.position.y = 3.2;
    esfera.castShadow = true;
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
    poste.castShadow = true;
    grupo.add(poste);

    var placa = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 0.1), materialPlaca);
    placa.position.y = 3.2;
    placa.castShadow = true;
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

    // Obstáculos na primeira plataforma: Mola ajustada antes da barreira de picos
    criarMola(0, y, 24); // Mola vermelha imediatamente antes dos picos
    criarPicos(0, y, 19, { largura: 12, numPicos: 18 }); // Barreira de picos ocupa toda a largura da plataforma

    // Molas, Checkpoints, Ponte, Picos, Placa final
    [[0,28],[3,10],[-3,-20],[0,-30]].forEach(function(p){ criarMola(p[0], y, p[1]); });
    criarCheckpoint(-3, y, 14);
    criarCheckpoint(3, y, -22);
    criarPonte(-1, 0.4, 5, 6, 6);
    criarPicos(2, y, 6, 4);
    criarPicos(-2, y, -20, 4);
    criarPlacaFinal(0, y, -35);

    // Flores simétricas (±x): [absX, z, n]
    var floresSim = [
        [4,36,5],[3,32,5],[4,26,5],[4,20,5],[4,14,4],
        [4,8,4],[4,4,3],[4,-18,5],[4,-24,5],[4,-30,4],
        [12,18,4],[12,10,4],[12,-20,4]
    ];
    for (var i = 0; i < floresSim.length; i++) {
        var f = floresSim[i];
        criarFloresChao(-f[0], y, f[1], f[2]);
        criarFloresChao(f[0], y, f[1], f[2]);
    }
    // Flores centrais
    criarFloresChao(0, y, 34, 4);
    criarFloresChao(0, y, -34, 4);
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

    atualizarDimensoes();

    // --- Sem. 4: Movimento do Sonic com WASD (ambos os modos) ---
    if (sonicPlaceholder) {
        var vel = 8 * delta;
        var movX = 0, movZ = 0;
        if (teclasPremidas.w) movZ -= vel;
        if (teclasPremidas.s) movZ += vel;
        if (teclasPremidas.a) movX -= vel;
        if (teclasPremidas.d) movX += vel;
        if (movX !== 0 || movZ !== 0) {
            var nx = Math.max(-5, Math.min(5, sonicPlaceholder.position.x + movX));
            var nz = Math.max(-36, Math.min(36, sonicPlaceholder.position.z + movZ));

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
            // No modo 2D, nuvens se movem para o lado contrário (esquerda)
            nuvens[n].position.x -= delta * (0.4 + n * 0.08);
            if (nuvens[n].position.x < -40) {
                nuvens[n].position.x = 40;
            }
        } else {
            // Modo 3D normal
            nuvens[n].position.x += delta * (0.4 + n * 0.08);
            if (nuvens[n].position.x > 40) {
                nuvens[n].position.x = -40;
            }
        }
    }

    var tempo = relogio.elapsedTime;
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
        oceano.geometry.computeVertexNormals();
    }

    // Animação das ondas de praia (avanço/recuo cíclico)
    for (var ew = 0; ew < espumaOndas.length; ew++) {
        var onda = espumaOndas[ew];
        var dados = onda.userData;
        var ciclo = Math.sin(tempo * 0.5 + dados.fase);
        var avanco = ciclo * 3.0;
        var novaDist = dados.ladoPraia.limAreia + dados.ladoPraia.sinal * (dados.distBase + avanco);

        if (dados.ladoPraia.eixo === 'x') {
            onda.position.x = novaDist;
        } else {
            onda.position.z = novaDist;
        }

        onda.position.y = -2.65 + Math.max(0, ciclo) * 0.15;

        var opacidade = 0.3 + Math.max(0, -ciclo) * 0.5;
        onda.material.opacity = opacidade;
    }

    if (modoCamara === 'perspetiva') {
        var alvoSeguir = (modoBola && sonicBola) ? sonicBola : sonicPlaceholder;
        if (modoSeguirSonic && alvoSeguir) {
            var sp = alvoSeguir.position;
            var alvoPos = new THREE.Vector3(sp.x, sp.y + 6, sp.z + 14);
            camaraPerspetiva.position.lerp(alvoPos, 0.08);
            camaraPerspetiva.lookAt(sp.x, sp.y + 1, sp.z);
        } else {
            var preset = presetsCamara[Object.keys(presetsCamara).find(function(k) {
                return presetsCamara[k].nome === vistaAtual;
            })] || presetsCamara['1'];
            camaraPerspetiva.lookAt(preset.alvo[0], preset.alvo[1], preset.alvo[2]);
        }
    }

    renderer.render(cena, cameraAtiva);
    requestAnimationFrame(loop);
}

// --- Sem. 0/1 + Sem. 2: Inicialização ---
function Start() {
    criarTerreno();
    criarSkyboxRetro();
    criarLuzes();
    criarLooping();
    criarVegetacao();
    criarAneis();
    criarElementosNivel();
    criarSonicPlaceholder();
    renderer.render(cena, camaraPerspetiva);
    requestAnimationFrame(loop);
}
