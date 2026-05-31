// texturizacao.js — Objetivo 3: TextureLoader, texturas procedurais, RNG, relva
import * as THREE from 'three';
import { estado } from './estado.js';

// --- Inicialização do TextureLoader e texturas partilhadas ---
export function inicializarTexturizacao() {
    estado.carregadorTexturas = new THREE.TextureLoader();

    estado.texturaCascaPartilhada = estado.carregadorTexturas.load(
        'https://threejs.org/examples/textures/hardwood2_bump.jpg'
    );
    estado.texturaCascaPartilhada.wrapS = estado.texturaCascaPartilhada.wrapT = THREE.RepeatWrapping;
    estado.texturaCascaPartilhada.repeat.set(1, 3);
}

// --- Sem. 0/1: Textura xadrez (Canvas 2D, RepeatWrapping 8x8) ---
export function criarTexturaXadrez() {
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
export function criarTexturaRelva() {
    var canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    var ctx = canvas.getContext('2d');

    var grad = ctx.createLinearGradient(0, 512, 0, 0);
    grad.addColorStop(0, '#1a6020');
    grad.addColorStop(0.45, '#2d8f2d');
    grad.addColorStop(1,  '#4ab34a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    var tons = ['#196b19', '#228B22', '#2d9e2d', '#3dae3d', '#5bc05b', '#166016', '#4dbb4d', '#1f751f'];
    for (var i = 0; i < 3500; i++) {
        ctx.fillStyle = tons[Math.floor(Math.random() * tons.length)];
        var x = Math.random() * 512, y = Math.random() * 512;
        ctx.globalAlpha = 0.2 + Math.random() * 0.45;
        ctx.fillRect(x, y, 1 + Math.random() * 5, 1 + Math.random() * 3);
    }

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
export function criarTexturaAreia() {
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

// --- Inicializar materiais do terreno ---
export function inicializarMateriaisTerreno() {
    estado.texturaXadrezPartilhada = criarTexturaXadrez();
    estado.materialTerraPartilhado = new THREE.MeshStandardMaterial({
        map: estado.texturaXadrezPartilhada,
        roughness: 0.75
    });
}

// --- Superfície de relva unificada: base sólida + lâminas como filhos ---
export function criarSuperficieRelvaUnificada(terrainX, terrainZ, largX, compZ) {
    if (!estado._matsRelvaTufos) {
        estado._matsRelvaTufos = [0x1a5e1a, 0x1e6b1e, 0x245e24, 0x1c6020, 0x206820, 0x175318, 0x2a6a2a].map(function(cor) {
            return new THREE.MeshBasicMaterial({ color: cor, side: THREE.DoubleSide });
        });
        estado._geosRelvaTufo = [0.18, 0.26, 0.36].map(function(h) {
            var g = new THREE.PlaneGeometry(0.12, h);
            var pos = g.attributes.position;
            for (var v = 0; v < pos.count; v++) pos.setY(v, pos.getY(v) + h / 2);
            pos.needsUpdate = true;
            return g;
        });
    }

    var grupo = new THREE.Group();

    var matBase = new THREE.MeshStandardMaterial({ color: 0x2a7232, roughness: 0.9, metalness: 0.0 });
    var geoBase = new THREE.BoxGeometry(largX + 0.5, 0.20, compZ + 0.5);
    var base = new THREE.Mesh(geoBase, matBase);
    base.position.y = 0.10;
    base.receiveShadow = true;
    grupo.add(base);

    var num = Math.floor(largX * compZ * 3.0);
    for (var i = 0; i < num; i++) {
        var lx = (Math.random() - 0.5) * largX;
        var lz = (Math.random() - 0.5) * compZ;

        var tufo = new THREE.Group();
        var nPlanos = Math.random() < 0.5 ? 2 : 3;
        var mat = estado._matsRelvaTufos[Math.floor(Math.random() * estado._matsRelvaTufos.length)];
        var geo = estado._geosRelvaTufo[Math.floor(Math.random() * estado._geosRelvaTufo.length)];
        for (var p = 0; p < nPlanos; p++) {
            var plano = new THREE.Mesh(geo, mat);
            plano.rotation.y = (p * Math.PI) / nPlanos;
            tufo.add(plano);
        }

        tufo.position.set(lx, 0.20, lz);
        tufo.rotation.y = Math.random() * Math.PI;
        tufo.userData.faseBrisa = Math.random() * Math.PI * 2;
        tufo.userData.worldX = terrainX + lx;
        tufo.userData.worldZ = terrainZ + lz;

        grupo.add(tufo);
        estado.tufosRelva.push(tufo);
    }

    console.log('[Relva] segmento (' + terrainX + ',' + terrainZ + ') — ' + num + ' lâminas, total ' + estado.tufosRelva.length);
    return grupo;
}

// --- RNG simples com seed (para árvores reproduzíveis) ---
export function criarRNG(seed) {
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

// --- Gerador de ramo recursivo (CylinderGeometry + gnarliness + folhas no nível final) ---
export function gerarRamo(grupo, origem, orientacao, comprimento, raio, nivel, maxNivel, params, rng) {
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

// --- Gerador de folhas cross-plane (2 PlaneGeometry perpendiculares por cluster) ---
export function gerarFolhas(grupo, pontosRamo, params, rng) {
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
        var materialFolha = estado.materiaisFolhas[cor] || (estado.materiaisFolhas[cor] = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.6, side: THREE.DoubleSide }));
        var tamanho = tamanhoFolha * rng.range(0.7, 1.3);
        var baseRotY = rng.range(0, Math.PI * 2);

        for (var cp = 0; cp < 2; cp++) {
            var plano = new THREE.Mesh(new THREE.PlaneGeometry(tamanho, tamanho, 3, 3), materialFolha);
            deformarFolha(plano, rng);
            plano.position.copy(posicao);
            plano.rotation.set(rng.range(-0.3, 0.3), baseRotY + cp * Math.PI / 2, 0);
            plano.userData.eFolha = true;
            plano.userData.fase = rng.range(0, Math.PI * 2);
            grupo.add(plano);
        }
    }
}

// --- Deformação de vértices das folhas (curvatura natural) ---
export function deformarFolha(mesh, rng) {
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
