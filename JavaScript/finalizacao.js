// finalizacao.js — Objetivo 7: Colisões, Checkpoints e Elementos de Nível
import * as THREE from 'three';
import { estado } from './estado.js';

// ============================================================
// Sem. 3: Elementos clássicos de nível
// ============================================================

// Mola / Spring
export function criarMola(x, y, z) {
    var grupo = new THREE.Group();

    var materialBase = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.4 });
    var materialTopo = new THREE.MeshStandardMaterial({ color: 0xffdd00, roughness: 0.3, metalness: 0.5 });
    var materialMola = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.8 });

    var base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.3, 12), materialBase);
    base.position.y = 0.15;
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
    grupo.add(topo);

    grupo.position.set(x, y, z);
    estado.elementosNivel.push({ grupo: grupo, tipo: 'mola' });
    estado.cena.add(grupo);
    return grupo;
}

// Checkpoint: poste + esfera azul
export function criarCheckpoint(x, y, z) {
    var grupo = new THREE.Group();

    var materialPoste = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.7 });
    var materialTopo  = new THREE.MeshStandardMaterial({ color: 0x2266ff, roughness: 0.3, metalness: 0.5 });

    var poste = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3, 8), materialPoste);
    poste.position.y = 1.5;
    grupo.add(poste);

    var esfera = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), materialTopo);
    esfera.position.y = 3.2;
    grupo.add(esfera);

    var basePoste = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.2, 8), materialPoste);
    basePoste.position.y = 0.1;
    grupo.add(basePoste);

    grupo.position.set(x, y, z);
    estado.elementosNivel.push({ grupo: grupo, tipo: 'checkpoint' });
    estado.cena.add(grupo);
    return grupo;
}

// Ponte: tábuas de madeira com corrimãos
export function criarPonte(x, y, z, comprimento, numTabuas, largura) {
    var grupo = new THREE.Group();
    numTabuas = numTabuas || 8;
    largura   = largura   || 10;

    var materialTabua = new THREE.MeshStandardMaterial({ color: 0x8B6B3D, roughness: 0.8 });
    var materialCorda = new THREE.MeshStandardMaterial({ color: 0x5A4020, roughness: 0.9 });

    var espacamento = comprimento / numTabuas;
    var meiaLarg    = largura / 2;

    for (var cx = -1; cx <= 1; cx += 2) {
        var corda = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, comprimento, 4), materialCorda);
        corda.rotation.x = Math.PI / 2;
        corda.position.set(cx * meiaLarg, 0, comprimento / 2);
        grupo.add(corda);
    }

    for (var i = 0; i < numTabuas; i++) {
        var tabua = new THREE.Mesh(
            new THREE.BoxGeometry(largura, 0.12, espacamento * 0.85),
            materialTabua
        );
        tabua.position.set(0, -0.06, i * espacamento + espacamento / 2);
        tabua.receiveShadow = true;
        tabua.castShadow    = true;
        grupo.add(tabua);
    }

    var alturaPoste = 1.2;
    var numPostes   = numTabuas + 1;
    var passoPoste  = comprimento / numTabuas;
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
        var corrimao = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, comprimento, 4),
            materialCorda
        );
        corrimao.rotation.x = Math.PI / 2;
        corrimao.position.set(lado * meiaLarg, alturaPoste, comprimento / 2);
        grupo.add(corrimao);
        var corrimaoMedio = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, comprimento, 4),
            materialCorda
        );
        corrimaoMedio.rotation.x = Math.PI / 2;
        corrimaoMedio.position.set(lado * meiaLarg, alturaPoste * 0.5, comprimento / 2);
        grupo.add(corrimaoMedio);
    }

    grupo.position.set(x, y, z);
    estado.elementosNivel.push({ grupo: grupo, tipo: 'ponte' });
    estado.cena.add(grupo);
    return grupo;
}

// Tapete de velocidade (Speed Pad)
export function criarTapeteVelocidade(x, y, z) {
    var grupo = new THREE.Group();
    var matBase = new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.6, roughness: 0.3, emissive: 0xffaa00, emissiveIntensity: 0.4 });
    var matSeta = new THREE.MeshStandardMaterial({ color: 0xff4400, metalness: 0.3, roughness: 0.4, emissive: 0xff2200, emissiveIntensity: 0.5 });

    var base = new THREE.Mesh(new THREE.BoxGeometry(6, 0.12, 2.5), matBase);
    base.receiveShadow = true;
    grupo.add(base);

    for (var s = 0; s < 3; s++) {
        var setaGrupo = new THREE.Group();
        var haste = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.8), matSeta);
        haste.position.set(0, 0.14, 0.1);
        setaGrupo.add(haste);
        var ponta = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 4), matSeta);
        ponta.rotation.x = Math.PI / 2;
        ponta.rotation.y = Math.PI / 4;
        ponta.position.set(0, 0.14, -0.45);
        setaGrupo.add(ponta);
        setaGrupo.position.x = (s - 1) * 1.6;
        grupo.add(setaGrupo);
    }

    grupo.position.set(x, y, z);
    estado.cena.add(grupo);
    return grupo;
}

// Flores decorativas no chão
export function criarFloresChao(x, y, z, numFlores) {
    if (!estado._matCauleFlor) {
        estado._matCauleFlor  = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.7 });
        estado._matCentroFlor = new THREE.MeshBasicMaterial({ color: 0xffee00 });
        estado._matsPetalaFlor = [0xff69b4, 0xffdd44, 0xff4444, 0xffffff, 0xff88cc].map(function(c) {
            return new THREE.MeshBasicMaterial({ color: c });
        });
        estado._geoCauleFlor  = new THREE.CylinderGeometry(0.02, 0.03, 0.4, 4);
        estado._geoCentroFlor = new THREE.SphereGeometry(0.06, 6, 4);
        estado._geoPetalaFlor = new THREE.SphereGeometry(0.05, 6, 4);
    }

    numFlores = numFlores || 5;
    var grupo = new THREE.Group();

    for (var f = 0; f < numFlores; f++) {
        var grupoFlor = new THREE.Group();

        var caule = new THREE.Mesh(estado._geoCauleFlor, estado._matCauleFlor);
        caule.position.y = 0.2;
        grupoFlor.add(caule);

        var matPetala = estado._matsPetalaFlor[f % estado._matsPetalaFlor.length];
        var centro = new THREE.Mesh(estado._geoCentroFlor, estado._matCentroFlor);
        centro.position.y = 0.42;
        grupoFlor.add(centro);

        for (var p = 0; p < 5; p++) {
            var petala = new THREE.Mesh(estado._geoPetalaFlor, matPetala);
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
    estado.cena.add(grupo);
    return grupo;
}

// Placa final (Goal Post)
export function criarPlacaFinal(x, y, z) {
    var grupo = new THREE.Group();

    var materialPoste  = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.7 });
    var materialPlaca  = new THREE.MeshStandardMaterial({ color: 0x2244aa, roughness: 0.3 });
    var materialEstrela = new THREE.MeshBasicMaterial({ color: 0xffdd00 });

    var poste = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.5, 8), materialPoste);
    poste.position.y = 1.75;
    grupo.add(poste);

    var placa = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 0.1), materialPlaca);
    placa.position.y = 3.2;
    grupo.add(placa);

    var estrela = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), materialEstrela);
    estrela.position.y = 3.2;
    estrela.position.z = 0.1;
    grupo.add(estrela);

    grupo.position.set(x, y, z);
    estado.elementosNivel.push({ grupo: grupo, tipo: 'placaFinal' });
    estado.cena.add(grupo);
    return grupo;
}

// Picos / Spikes
export function criarPicos(x, y, z, opcoes) {
    var grupo = new THREE.Group();
    var numPicos = 3;
    var largura  = null;

    if (typeof opcoes === 'number') {
        numPicos = opcoes || 3;
        largura  = numPicos * 0.7 + 0.4;
    } else if (typeof opcoes === 'object' && opcoes !== null) {
        largura  = opcoes.largura  || 0;
        numPicos = opcoes.numPicos || 3;
        if (largura <= 0) largura = numPicos * 0.7 + 0.4;
    } else {
        largura = numPicos * 0.7 + 0.4;
    }

    var materialPico     = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.15, metalness: 0.9 });
    var materialBasePico = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.4 });
    var materialColisao  = new THREE.MeshBasicMaterial({ visible: false });

    var basePicos = new THREE.Mesh(new THREE.BoxGeometry(largura, 0.2, 0.8), materialBasePico);
    basePicos.position.y = 0.1;
    basePicos.receiveShadow = true;
    grupo.add(basePicos);

    var passo  = numPicos > 1 ? largura / (numPicos - 1) : 0;
    var xInicio = -largura / 2;

    for (var p = 0; p < numPicos; p++) {
        var pico = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.0, 8), materialPico);
        pico.position.set(xInicio + p * passo, 0.7, 0);
        pico.castShadow = true;
        grupo.add(pico);
    }

    var colisorPicos = new THREE.Mesh(new THREE.BoxGeometry(largura, 0.8, 0.8), materialColisao);
    colisorPicos.position.set(0, 0.4, 0);
    colisorPicos.userData = { tipo: 'picos', largura: largura, profundidade: 0.8 };
    grupo.add(colisorPicos);

    grupo.position.set(x, y, z);
    estado.elementosNivel.push({ grupo: grupo, tipo: 'picos', colisao: colisorPicos });
    estado.areasColisao.push(colisorPicos);
    estado.cena.add(grupo);
    return grupo;
}

// Posicionamento de todos os elementos ao longo do nível
export function criarElementosNivel() {
    var y = 0.35;

    // Plataforma 1 (z=+40 a z=+15)
    criarPicos(0, y, 32, { largura: 10, numPicos: 14 });
    criarTapeteVelocidade(0, y, 17);

    // Espaço 1: ponte Plat1→Plat2
    criarPonte(0, 0.35, 5, 10, 10, 10);

    // Plataforma 2 (z=+5 a z=-20)
    criarCheckpoint(0, y, 4);
    criarPicos(3, y, -4, { largura: 6, numPicos: 8 });
    criarPicos(-3, y, -14, { largura: 6, numPicos: 8 });
    criarCheckpoint(0, y, -19);

    // Plataforma 3 (z=-36 a z=-56)
    criarPicos(0, y, -50, { largura: 10, numPicos: 14 });

    // Espaço 3: ponte Plat3→Plat4
    criarPonte(0, 0.35, -61, 5, 5, 10);

    // Plataforma 4 (z=-61 a z=-86)
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
        criarFloresChao( f[0], y, f[1], f[2]);
    }
    // Flores na plataforma 4
    criarFloresChao(-4, y, -66, 4);
    criarFloresChao( 4, y, -66, 4);
    criarFloresChao(-4, y, -76, 3);
    criarFloresChao( 4, y, -76, 3);
}

// Boxes pré-alocados para colisão (evita GC por frame)
var _sonicBox   = new THREE.Box3();
var _colisorBox = new THREE.Box3();

// ============================================================
// Atualização por frame: colisão com picos + checkpoints
// ============================================================
export function atualizarFinalizacao(delta) {
    if (!estado.sonicPlaceholder) return;

    // Colisão com picos
    if (!estado.sonicMorreu && !estado.modoLoop && estado.sonicInvencivel <= 0) {
        var alvoCol = (estado.modoBola && estado.sonicBola) ? estado.sonicBola : estado.sonicPlaceholder;
        _sonicBox.setFromObject(alvoCol);
        for (var ci = 0; ci < estado.areasColisao.length; ci++) {
            estado.areasColisao[ci].updateMatrixWorld(true);
            _colisorBox.setFromObject(estado.areasColisao[ci]);
            if (_sonicBox.intersectsBox(_colisorBox)) {
                if (estado._callbacks.sonicMorrer) estado._callbacks.sonicMorrer();
                break;
            }
        }
    }

    // Ativar checkpoints por proximidade
    if (!estado.sonicMorreu) {
        var sx = estado.sonicPlaceholder.position.x;
        var sz = estado.sonicPlaceholder.position.z;
        for (var ck = 0; ck < estado.elementosNivel.length; ck++) {
            var el = estado.elementosNivel[ck];
            if (el.tipo !== 'checkpoint') continue;
            var ep = el.grupo.position;
            var dist2 = (sx - ep.x) * (sx - ep.x) + (sz - ep.z) * (sz - ep.z);
            if (dist2 < 9 && ep.z < estado.ultimoCheckpoint.z) {
                estado.ultimoCheckpoint.set(ep.x, estado.CHAO_Y_SONIC, ep.z);
            }
        }
    }
}
