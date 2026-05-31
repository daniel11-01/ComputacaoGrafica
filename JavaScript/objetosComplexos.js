// objetosComplexos.js — Objetivo 2: Looping GLB, Palmeiras, Anéis, Barcos, Gaivotas, Ilhas
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { estado } from './estado.js';
import { criarRNG, gerarRamo, gerarFolhas, deformarFolha } from './texturizacao.js';

var carregadorGLTF = new GLTFLoader();

// ============================================================
// Sem. 2: Looping — modelo GLB do Blender
// ============================================================
export function criarLooping() {
    carregadorGLTF.load('assets/loop.glb', function(gltf) {
        var loop = gltf.scene;

        var box = new THREE.Box3().setFromObject(loop);
        var size = new THREE.Vector3();
        box.getSize(size);
        var escala = 16 / Math.max(size.x, size.y, size.z);
        loop.scale.setScalar(escala);

        box.setFromObject(loop);
        var centroX = (box.min.x + box.max.x) / 2;
        loop.position.set(-centroX, -box.min.y - 2.3, -28.75);

        box.setFromObject(loop);
        estado.LOOP_CY   = (box.min.y + box.max.y) / 2;
        estado.LOOP_RAIO = estado.LOOP_CY - estado.CHAO_Y_SONIC;

        loop.traverse(function(node) {
            if (node.isMesh) {
                node.castShadow    = true;
                node.receiveShadow = true;
            }
        });

        estado.cena.add(loop);
    }, undefined, function(err) {
        console.error('[loop.glb] erro ao carregar:', err);
    });
}

// ============================================================
// Sem. 2 + Sem. 3: Vegetação Procedural
// ============================================================

// Helper para finalizar qualquer peça de vegetação
function finalizarVegetacao(grupo, posX, posZ, escala, tipo, ePalmeira) {
    grupo.scale.setScalar(escala);
    grupo.position.set(posX, 0, posZ);
    if (ePalmeira) estado.palmeiras.push(grupo);
    estado.vegetacao.push({ grupo: grupo, tipo: tipo });
    estado.cena.add(grupo);
    return grupo;
}

// TIPO A: Palmeira Tropical (tronco reto segmentado + folhas largas em leque)
export function criarPalmeira(posX, posZ, escala) {
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
        geoFolha.translate(0, 0.425, 0);
        var pos = geoFolha.attributes.position;
        for (var v = 0; v < pos.count; v++) {
            var yL = pos.getY(v);
            var xL = pos.getX(v);
            var tv = yL / 0.85;
            var larg = Math.sin(tv * Math.PI);
            if (larg < 0.12) larg = 0.12;
            pos.setX(v, (xL / 0.45) * larg * 0.85);
            pos.setZ(v, -tv * tv * tv * 2.0);
        }
        pos.needsUpdate = true;
        geoFolha.computeVertexNormals();

        var folha = new THREE.Mesh(geoFolha, mat);
        var grupoFolha = new THREE.Group();
        grupoFolha.rotation.order = 'YXZ';
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

// TIPO B: Árvore Ramificada (ramificação recursiva 2-3 níveis + gnarliness)
export function criarArvoreRamificada(posX, posZ, escala) {
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
export function criarArbusto(posX, posZ, escala) {
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

    var tamHull = 0.55 + rng.range(0, 0.55);
    var matHull = new THREE.MeshStandardMaterial({
        color: 0x267326, roughness: 0.9, transparent: true, opacity: 0.32
    });
    var hull = new THREE.Mesh(new THREE.SphereGeometry(tamHull, 9, 7), matHull);
    hull.position.y = 0.45 + tamHull * 0.45;
    hull.scale.set(1.05, 0.80, 1.05);
    grupo.add(hull);

    if (rng.next() > 0.20) {
        var tiposBaga = [
            { cor: 0x3a0f5e, brilho: 0x6b2a9e },
            { cor: 0xbb1133, brilho: 0xff3355 },
            { cor: 0x7a0000, brilho: 0xcc2222 }
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
export function criarVegetacao() {
    var palmZ = [
        [38,1.0],[30,1.1],[22,1.0],[18,0.9],
        [3,0.9],[-5,1.0],[-15,1.0],
        [-39,1.05],[-48,1.0],[-54,0.9],
        [-64,1.0],[-72,1.1],[-78,0.9],[-83,1.0]
    ];
    for (var i = 0; i < palmZ.length; i++) {
        criarPalmeira(-5, palmZ[i][0], palmZ[i][1]);
        criarPalmeira(5, palmZ[i][0], palmZ[i][1]);
    }
    var arbZ = [
        [35,1.0],[27,1.1],[19,0.9],
        [1,0.9],[-8,1.0],[-17,1.0],
        [-42,0.8],[-50,1.0],
        [-67,0.9],[-75,1.0],[-81,0.8]
    ];
    for (var k = 0; k < arbZ.length; k++) {
        criarArbusto(-4, arbZ[k][0], arbZ[k][1]);
        criarArbusto(4, arbZ[k][0], arbZ[k][1]);
    }
}

// ============================================================
// Sem. 2: Anéis (TorusGeometry + MeshPhysicalMaterial dourado)
// ============================================================
export function criarAneis() {
    var materialDourado = new THREE.MeshPhysicalMaterial({
        color: 0xffcc33, metalness: 0.9, roughness: 0.12, reflectivity: 1.0, clearcoat: 0.3
    });

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
        grupoAnel.add(anel);
        grupoAnel.add(new THREE.Mesh(geoAnelBrilho, materialBrilho));
        grupoAnel.position.set(pos[i][0], pos[i][1], pos[i][2]);
        grupoAnel.rotation.y = Math.PI / 2;
        estado.aneisDecorativos.push(grupoAnel);
        estado.cena.add(grupoAnel);
    }
}

// ============================================================
// Sem. 5: Ilhas distantes no horizonte (low-poly, decorativas)
// ============================================================
export function criarIlhasDistantes() {
    var matAreiaIlha = new THREE.MeshBasicMaterial({ color: 0xe8c876 });
    var matVerdeClaro = new THREE.MeshBasicMaterial({ color: 0x39b54a });
    var matVerdeEsc   = new THREE.MeshBasicMaterial({ color: 0x16853a });
    var matRocha      = new THREE.MeshBasicMaterial({ color: 0x7a7670 });
    var matRochaEsc   = new THREE.MeshBasicMaterial({ color: 0x5a5650 });
    var matArbusto    = new THREE.MeshBasicMaterial({ color: 0x2d8a3a });
    var matsFlores    = [
        new THREE.MeshBasicMaterial({ color: 0xff6b6b }),
        new THREE.MeshBasicMaterial({ color: 0xffd93d }),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    ];

    var defs = [
        [0.3,   95, 7, 1.2],
        [1.1,  100, 5, 0.9],
        [1.9,   85, 8, 1.4],
        [2.7,  105, 6, 1.0],
        [3.6,  140, 5, 0.8],
        [4.5,  100, 7, 1.3],
        [5.4,   95, 6, 1.1]
    ];

    var extras = [
        [-85,  -20, 7, 1.3],
        [-90,    0, 6, 1.2],
        [-95,   20, 6, 1.1],
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
        var rngIlha = criarRNG(Math.floor(x * 13 + z * 31 + 1000));

        var base = new THREE.Mesh(
            new THREE.CylinderGeometry(d[2], d[2] * 1.15, d[3], 12),
            matAreiaIlha
        );
        base.position.y = d[3] / 2 - 1.5;
        grupo.add(base);

        var raioRelva = d[2] * 0.78;
        var relva = new THREE.Mesh(
            new THREE.CylinderGeometry(raioRelva * 0.95, raioRelva, 0.25, 14),
            matVerdeClaro
        );
        relva.position.y = d[3] - 1.5 + 0.125;
        grupo.add(relva);

        var bordo = new THREE.Mesh(
            new THREE.CylinderGeometry(raioRelva * 1.02, raioRelva * 1.02, 0.08, 14),
            matVerdeEsc
        );
        bordo.position.y = d[3] - 1.5 + 0.04;
        grupo.add(bordo);

        var escalaBase = d[2] * 0.30;
        var numPalm = Math.max(3, Math.floor(d[2] * 0.8 + rngIlha.range(0, 2)));

        for (var p = 0; p < numPalm; p++) {
            var angP = rngIlha.next() * Math.PI * 2;
            var distP = Math.sqrt(rngIlha.next()) * raioRelva * 0.85;
            var dx = Math.cos(angP) * distP;
            var dz = Math.sin(angP) * distP;
            var escalaP = escalaBase * rngIlha.range(0.80, 1.20);

            var palm = criarPalmeira(x + dx, z + dz, escalaP);
            estado.cena.remove(palm);
            palm.position.set(dx, d[3] - 1.5 + 0.25, dz);
            grupo.add(palm);
        }

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
        estado.ilhasDistantes.push(grupo);
        estado.cena.add(grupo);
    }
}

// ============================================================
// Sem. 5: Barcos a navegar em loop circular
// ============================================================
export function criarBarco() {
    var configs = [
        { cx: -71, cz: -30, raio: 6, vel: 0.18, fase: 0,        corVela: 0xfafafa },
        { cx: -63, cz:  28, raio: 6, vel: 0.13, fase: Math.PI,  corVela: 0xffe28a }
    ];

    for (var b = 0; b < configs.length; b++) {
        var cfg = configs[b];
        var barco = new THREE.Group();

        var matCasco  = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.80 });
        var matDeck   = new THREE.MeshStandardMaterial({ color: 0xd4956a, roughness: 0.75 });
        var matMad    = new THREE.MeshStandardMaterial({ color: 0x4a2a0e, roughness: 0.88 });
        var matVela   = new THREE.MeshBasicMaterial({ color: cfg.corVela, side: THREE.DoubleSide });
        var matMetal  = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.45, metalness: 0.75 });
        var matBarril = new THREE.MeshStandardMaterial({ color: 0xa06030, roughness: 0.88 });

        // Casco com proa afilada
        var geoHull = new THREE.BoxGeometry(2.4, 1.5, 7.5, 1, 2, 8);
        var posH = geoHull.attributes.position;
        for (var hv = 0; hv < posH.count; hv++) {
            var hz = posH.getZ(hv);
            var hx = posH.getX(hv);
            var hy = posH.getY(hv);
            var newX = hx;
            if (hz > 1.5) {
                var tBow = Math.min(1.0, (hz - 1.5) / 2.25);
                newX *= (1.0 - tBow * 0.96);
            }
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

        var popaSupra = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 1.6), matCasco);
        popaSupra.position.set(0, 0.88, -3.0);
        popaSupra.castShadow = true;
        barco.add(popaSupra);

        var deck = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.14, 5.0), matDeck);
        deck.position.set(0, 0.83, -0.85);
        deck.receiveShadow = true;
        barco.add(deck);

        var deckPopa = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 1.55), matDeck);
        deckPopa.position.set(0, 1.30, -3.0);
        barco.add(deckPopa);

        var mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.13, 9.0, 8), matMad);
        mastro.position.set(0, 5.3, 0.1);
        mastro.castShadow = true;
        barco.add(mastro);

        var verga = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 5.4, 6), matMad);
        verga.rotation.z = Math.PI / 2;
        verga.position.set(0, 8.0, 0.1);
        barco.add(verga);

        var bowsprit = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 2.5, 6), matMad);
        bowsprit.rotation.x = -Math.PI / 9;
        bowsprit.position.set(0, 1.25, 3.2);
        barco.add(bowsprit);

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

        var cesto = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.38, 0.42, 8), matDeck);
        cesto.position.set(0, 9.6, 0.1);
        barco.add(cesto);

        var geoBand = new THREE.PlaneGeometry(1.5, 0.55, 10, 4);
        var posBand = geoBand.attributes.position;
        for (var bv = 0; bv < posBand.count; bv++) {
            var bx = posBand.getX(bv);
            var by = posBand.getY(bv);
            var tBand = (bx + 0.75) / 1.5;
            posBand.setZ(bv, Math.sin(tBand * Math.PI) * 0.38);
            posBand.setY(bv, by - tBand * 0.12);
        }
        posBand.needsUpdate = true;
        geoBand.computeVertexNormals();
        var bandeira = new THREE.Mesh(
            geoBand,
            new THREE.MeshBasicMaterial({ color: 0xcc1111, side: THREE.DoubleSide })
        );
        bandeira.position.set(0.75, 9.85, 0.1);
        barco.add(bandeira);

        // Cordas de rigging
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
        addCorda(-2.7, 8.0, 0.1,  0, 2.42, 2.77);
        addCorda( 2.7, 8.0, 0.1,  0, 2.42, 2.77);
        addCorda(0, 9.8, 0.1,  0,    1.2, -3.8);
        addCorda(-2.7, 8.0, 0.1, -1.15, 0.9, 1.5);
        addCorda( 2.7, 8.0, 0.1,  1.15, 0.9, 1.5);

        // Canhões
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

        // Barris
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

        // Railing
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
        estado.barcos.push(barco);
        estado.cena.add(barco);
    }
}

// ============================================================
// Sem. 5: Gaivotas animadas no céu
// ============================================================
export function criarGaivotas() {
    var matAsa = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

    for (var g = 0; g < 6; g++) {
        var grupo = new THREE.Group();

        var asaE = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.25), matAsa);
        asaE.position.x = -0.55;
        asaE.userData.lado = -1;
        grupo.add(asaE);

        var asaD = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.25), matAsa);
        asaD.position.x = 0.55;
        asaD.userData.lado = 1;
        grupo.add(asaD);

        grupo.userData.raio   = 40 + g * 5;
        grupo.userData.altura = 14 + (g % 3) * 2;
        grupo.userData.fase   = g * 1.05;
        grupo.userData.vel    = 0.15 + (g % 3) * 0.04;

        estado.cena.add(grupo);
        estado.gaivotas.push(grupo);
    }
}

// ============================================================
// Atualização por frame: anéis, barcos, gaivotas, vegetação, palmeiras
// ============================================================
export function atualizarObjetosComplexos(delta, tempo) {
    // Rotação dos anéis
    for (var i = 0; i < estado.aneisDecorativos.length; i++) {
        estado.aneisDecorativos[i].rotateY(delta * 2.5);
    }

    // Sway das frondas das palmeiras
    for (var p = 0; p < estado.palmeiras.length; p++) {
        var palm = estado.palmeiras[p];
        for (var ch = 0; ch < palm.children.length; ch++) {
            var filho = palm.children[ch];
            if (filho.userData.anguloBase !== undefined) {
                filho.rotation.x = filho.userData.anguloBase +
                    Math.sin(tempo * 1.2 + filho.userData.fase) * 0.03;
            }
        }
    }

    // Órbita dos barcos
    for (var bi = 0; bi < estado.barcos.length; bi++) {
        var b = estado.barcos[bi];
        var ud = b.userData;
        var ang = tempo * ud.vel + ud.fase;
        b.position.x = ud.cx + Math.cos(ang) * ud.raio;
        b.position.z = ud.cz + Math.sin(ang) * ud.raio;
        b.position.y = -2.9 + Math.sin(tempo * 0.8 + ud.fase) * 0.15;
        b.rotation.y = -ang;
        b.rotation.z = Math.sin(tempo * 0.8 + ud.fase) * 0.04;
    }

    // Voo das gaivotas
    for (var gv = 0; gv < estado.gaivotas.length; gv++) {
        var gaiv = estado.gaivotas[gv];
        var udG = gaiv.userData;
        var angG = tempo * udG.vel + udG.fase;
        gaiv.position.set(
            Math.cos(angG) * udG.raio,
            udG.altura + Math.sin(tempo * 0.6 + udG.fase) * 0.5,
            Math.sin(angG) * udG.raio - 20
        );
        gaiv.rotation.y = -angG + Math.PI / 2;
        var batida = Math.sin(tempo * 6 + udG.fase) * 0.6;
        gaiv.children[0].rotation.z =  batida;
        gaiv.children[1].rotation.z = -batida;
    }

    // Flutter das folhas de árvores e arbustos
    for (var vg = 0; vg < estado.vegetacao.length; vg++) {
        var veg = estado.vegetacao[vg];
        if (veg.tipo === 'ramificada' || veg.tipo === 'arbusto') {
            var filhos = veg.grupo.children;
            for (var fc = 0; fc < filhos.length; fc++) {
                if (filhos[fc].userData.eFolha) {
                    filhos[fc].rotation.z += Math.sin(tempo * 1.5 + filhos[fc].userData.fase) * 0.001;
                }
            }
        }
    }
}
