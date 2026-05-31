// ambiente.js — Objetivo 1: Setup da Scene, Renderer, Terreno e Skybox retro
import * as THREE from 'three';
import { estado } from './estado.js';
import { inicializarMateriaisTerreno, criarTexturaAreia, criarSuperficieRelvaUnificada } from './texturizacao.js';

// --- Inicializar cena, renderer e relógio ---
export function inicializarAmbiente() {
    estado.cena = new THREE.Scene();
    estado.relogio = new THREE.Clock();

    estado.renderer = new THREE.WebGLRenderer({ antialias: true });
    estado.renderer.setSize(window.innerWidth - 15, window.innerHeight - 100);
    estado.renderer.setClearColor(0x6ec6ff, 1.0);
    estado.renderer.outputColorSpace = THREE.SRGBColorSpace;
    estado.renderer.shadowMap.enabled = true;
    estado.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    document.body.appendChild(estado.renderer.domElement);
}

// --- Sem. 0/1 + Sem. 3: Terreno linear (terra xadrez + relva + praia + oceano) ---
export function criarTerreno() {
    inicializarMateriaisTerreno();

    // Plataforma 1: z=+40 a z=+15
    _criarSegmentoTerreno(0, 27.5, 12, 25, 4, 0);
    // Plataforma 2: z=+5 a z=-20
    _criarSegmentoTerreno(0, -7.5, 12, 25, 4, 0);
    // Plataforma 3: z=-36 a z=-56
    _criarSegmentoTerreno(0, -46, 12, 20, 4, 0);
    // Plataforma 4: z=-61 a z=-86
    _criarSegmentoTerreno(0, -73.5, 12, 25, 4, 0);

    // === PRAIA: Areia com perfil elíptico + degradê de cor ===
    var segsX = 48, segsZ = 72;
    var geoAreia = new THREE.PlaneGeometry(130, 180, segsX, segsZ);
    geoAreia.rotateX(-Math.PI / 2);
    var posAreia = geoAreia.attributes.position;
    var rX = 65, rZ = 90;
    var corAreia   = new THREE.Color(0xf2d98b);
    var corMolhada = new THREE.Color(0xc8a84b);
    var corMar     = new THREE.Color(0x0e5e8c);
    var cores = [];
    for (var v = 0; v < posAreia.count; v++) {
        var vx = posAreia.getX(v);
        var vz = posAreia.getZ(v);
        var distElip = Math.sqrt((vx / rX) * (vx / rX) + (vz / rZ) * (vz / rZ));
        var t = Math.max(0, (distElip - 0.4) / 0.6);
        var descida = t > 0 ? (1 - Math.cos(t * Math.PI * 0.5)) * 4.5 : 0;
        if (distElip > 1.0) descida = 4.5 + (distElip - 1.0) * 3;
        posAreia.setY(v, -descida);
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
    estado.cena.add(areia);

    // Montes de areia
    var materialAreiaClara = new THREE.MeshStandardMaterial({ color: 0xf7e4a8, roughness: 0.95 });
    var montesAreia = [[-20,20,3],[22,15,2.5],[-22,-10,2.8],[20,-25,3.2],[-25,30,2],[25,-5,2.3],[-18,-30,2.5],[18,32,2.8]];
    for (var m = 0; m < montesAreia.length; m++) {
        var monte = new THREE.Mesh(new THREE.SphereGeometry(montesAreia[m][2], 12, 8), materialAreiaClara);
        monte.position.set(montesAreia[m][0], -3.0, montesAreia[m][1]);
        monte.scale.set(1.5, 0.25, 1.2);
        monte.receiveShadow = true;
        estado.cena.add(monte);
    }

    // === MAR: Oceano com ondas ===
    var materialOceano = new THREE.MeshPhysicalMaterial({
        color: 0x0e5e8c, roughness: 0.12, metalness: 0.15,
        transparent: true, opacity: 0.88, side: THREE.DoubleSide
    });
    estado.oceano = new THREE.Mesh(new THREE.PlaneGeometry(300, 300, 60, 60), materialOceano);
    estado.oceano.rotation.x = -Math.PI / 2;
    estado.oceano.position.set(0, -3.2, 0);
    estado.oceano.receiveShadow = true;
    estado.cena.add(estado.oceano);
}

function _criarSegmentoTerreno(x, z, largX, compZ, altura, elevacao) {
    var grupo = new THREE.Group();

    var terra = new THREE.Mesh(
        new THREE.BoxGeometry(largX, altura, compZ),
        estado.materialTerraPartilhado
    );
    terra.position.y = -altura / 2;
    terra.receiveShadow = true;
    terra.castShadow = true;
    grupo.add(terra);

    grupo.add(criarSuperficieRelvaUnificada(x, z, largX, compZ));

    grupo.position.set(x, elevacao, z);
    estado.cena.add(grupo);
    return grupo;
}

// --- Sem. 0/1: Skybox retro (céu gradiente, sol, nuvens animadas) ---
export function criarSkyboxRetro() {
    estado.cena.fog = new THREE.Fog(0x6ec6ff, 80, 200);

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
    estado.ceu = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), matCeu);
    estado.cena.add(estado.ceu);

    var geometriaSol = new THREE.CircleGeometry(3, 48);
    var materialSol = new THREE.MeshBasicMaterial({ color: 0xffdc4a });
    estado.sol = new THREE.Mesh(geometriaSol, materialSol);
    estado.sol.position.set(0, 18, -50);
    estado.cena.add(estado.sol);

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
        var posZ = -35 + (n * 5) % 70;

        for (var parte = 0; parte < 3; parte++) {
            var esferaNuvem = new THREE.Mesh(geosNuvem[parte], materialNuvem);
            esferaNuvem.position.set(parte * 1.2, parte === 1 ? 0.45 : 0, 0);
            grupoNuvem.add(esferaNuvem);
        }

        grupoNuvem.position.set(posX, posY, posZ);
        grupoNuvem.scale.set(1.4, 0.55, 0.35);
        estado.nuvens.push(grupoNuvem);
        estado.cena.add(grupoNuvem);
    }
}

// --- Atualização por frame: nuvens, oceano, resize ---
export function atualizarAmbiente(delta, tempo) {
    // Nuvens
    for (var n = 0; n < estado.nuvens.length; n++) {
        if (estado.modoCamara === 'ortografica') {
            estado.nuvens[n].position.z += delta * (0.4 + n * 0.08);
            if (estado.nuvens[n].position.z > 50) estado.nuvens[n].position.z = -50;
        } else {
            estado.nuvens[n].position.x += delta * (0.4 + n * 0.08);
            if (estado.nuvens[n].position.x > 40) estado.nuvens[n].position.x = -40;
        }
    }

    // Ondas do oceano (ondulação direcional)
    if (estado.oceano) {
        var posOceano = estado.oceano.geometry.attributes.position;
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
    }
}
