// camaras.js — Objetivo 4: Câmaras Perspetiva, Ortográfica, Follow e Livre
import * as THREE from 'three';
import { estado } from './estado.js';

// labelVista é privado a este módulo (não entra em estado)
var labelVista;

// --- Inicializar câmaras e vetores pré-alocados ---
export function inicializarCamaras() {
    estado.camaraPerspetiva = new THREE.PerspectiveCamera(60, 4 / 3, 0.1, 1000);
    estado.camaraPerspetiva.position.set(25, 12, 10);
    estado.camaraPerspetiva.lookAt(0, 3, 0);

    _inicializarCameraOrtografica();
    estado.cameraAtiva = estado.camaraPerspetiva;

    // Vetores pré-alocados para o render loop (evitam alocações GC)
    estado._vCamForward      = new THREE.Vector3();
    estado._vCamRight        = new THREE.Vector3();
    estado._vCamDeslocamento = new THREE.Vector3();
    estado._vCamLookAt       = new THREE.Vector3();
    estado._vAlvoSeguir      = new THREE.Vector3();

    // HUD de vista
    labelVista = document.createElement('div');
    labelVista.style.cssText = 'position:fixed;top:10px;left:10px;background:rgba(0,0,0,0.7);color:#fff;padding:8px 16px;font-family:monospace;font-size:14px;border-radius:6px;z-index:100;pointer-events:none;';
    labelVista.textContent = 'Vista: Vista geral — O/0: side-scroll | C: Follow Sonic | F: câmara livre';
    document.body.appendChild(labelVista);
}

function _inicializarCameraOrtografica() {
    var largura = window.innerWidth - 15;
    var altura = window.innerHeight - 100;
    var aspect = largura / altura;
    var frustumSize = 18;

    estado.camaraOrtografica = new THREE.OrthographicCamera(
        -frustumSize * aspect,
         frustumSize * aspect,
         frustumSize,
        -frustumSize,
         0.1,
         200
    );

    estado.camaraOrtografica.position.set(30, 12, 0);
    estado.camaraOrtografica.up.set(0, 1, 0);
    estado.camaraOrtografica.lookAt(0, 3, 0);
    estado.camaraOrtografica.updateProjectionMatrix();
}

// --- Registar eventos de teclado e rato para as câmaras ---
export function registarEventosCamara() {
    document.addEventListener('keydown', function(evento) {
        var tecla = evento.key;
        var teclaLower = tecla.toLowerCase();

        if (tecla === 'o' || tecla === 'O' || tecla === '0') {
            if (estado.modoCamaraLivre) _desativarCamaraLivre();
            _alternarModoCamara();
        }
        if (teclaLower === 'c') {
            if (estado.modoCamaraLivre) _desativarCamaraLivre();
            estado.modoSeguirSonic = !estado.modoSeguirSonic;
            if (estado.modoSeguirSonic) estado.vistaAtual = 'Follow Sonic';
            else estado.vistaAtual = 'Vista geral';
            _atualizarLabelVista();
        }
        if (teclaLower === 'f') {
            _alternarCamaraLivre();
        }
        if (evento.code === 'Escape' && estado.modoCamaraLivre) {
            _desativarCamaraLivre();
        }
    });

    document.addEventListener('pointerlockchange', function() {
        if (document.pointerLockElement !== estado.renderer.domElement && estado.modoCamaraLivre) {
            _desativarCamaraLivre();
        }
    });

    document.addEventListener('mousemove', function(e) {
        if (!estado.modoCamaraLivre) return;
        if (document.pointerLockElement === estado.renderer.domElement) {
            var sensibilidade = 0.002;
            estado.camLivreYaw   -= e.movementX * sensibilidade;
            estado.camLivrePitch -= e.movementY * sensibilidade;
            var lim = Math.PI / 2 - 0.05;
            if (estado.camLivrePitch >  lim) estado.camLivrePitch =  lim;
            if (estado.camLivrePitch < -lim) estado.camLivrePitch = -lim;
        }
    });

    estado.renderer.domElement.addEventListener('wheel', function(e) {
        if (!estado.modoCamaraLivre) return;
        e.preventDefault();
        var velY = 4;
        if (e.deltaY < 0) estado.camaraPerspetiva.position.y += velY;
        else estado.camaraPerspetiva.position.y -= velY;
    }, { passive: false });
}

// --- Atualizar dimensões das câmaras após resize da janela ---
export function atualizarDimensoesCamara(largura, altura) {
    estado.camaraPerspetiva.aspect = largura / altura;
    estado.camaraPerspetiva.updateProjectionMatrix();

    if (estado.camaraOrtografica) {
        var frustumSize = 18;
        var aspect = largura / altura;
        estado.camaraOrtografica.left   = -frustumSize * aspect;
        estado.camaraOrtografica.right  =  frustumSize * aspect;
        estado.camaraOrtografica.top    =  frustumSize;
        estado.camaraOrtografica.bottom = -frustumSize;
        estado.camaraOrtografica.updateProjectionMatrix();
    }
}

// --- Atualizar câmaras por frame (câmara livre WASD + follow Sonic) ---
export function atualizarCamaras(delta) {
    // Câmara livre: movimento WASD + olhar com rato
    if (estado.modoCamaraLivre) {
        var velCam = (estado.teclasPremidas.shift && estado.teclasPremidas.control ? 40 : 20) * delta;
        var cosP = Math.cos(estado.camLivrePitch);
        estado._vCamForward.set(
            -Math.sin(estado.camLivreYaw) * cosP,
             Math.sin(estado.camLivrePitch),
            -Math.cos(estado.camLivreYaw) * cosP
        );
        estado._vCamRight.set(Math.cos(estado.camLivreYaw), 0, -Math.sin(estado.camLivreYaw));
        estado._vCamDeslocamento.set(0, 0, 0);
        if (estado.teclasPremidas.w) estado._vCamDeslocamento.addScaledVector(estado._vCamForward,  velCam);
        if (estado.teclasPremidas.s) estado._vCamDeslocamento.addScaledVector(estado._vCamForward, -velCam);
        if (estado.teclasPremidas.a) estado._vCamDeslocamento.addScaledVector(estado._vCamRight,   -velCam);
        if (estado.teclasPremidas.d) estado._vCamDeslocamento.addScaledVector(estado._vCamRight,    velCam);
        estado.camaraPerspetiva.position.add(estado._vCamDeslocamento);
        estado._vCamLookAt.copy(estado.camaraPerspetiva.position).add(estado._vCamForward);
        estado.camaraPerspetiva.lookAt(estado._vCamLookAt);
    }

    // Follow Sonic (lerp suave)
    if (estado.modoCamara === 'perspetiva') {
        var alvoSeguir = (estado.modoBola && estado.sonicBola) ? estado.sonicBola : estado.sonicPlaceholder;
        if (estado.modoSeguirSonic && alvoSeguir) {
            var sp = alvoSeguir.position;
            estado._vAlvoSeguir.set(sp.x, sp.y + 6, sp.z + 14);
            estado.camaraPerspetiva.position.lerp(estado._vAlvoSeguir, 0.08);
            estado.camaraPerspetiva.lookAt(sp.x, sp.y + 1, sp.z);
        }
    }
}

// --- Funções privadas ---

function _atualizarLabelVista() {
    if (!labelVista) return;
    if (estado.modoCamaraLivre) {
        labelVista.textContent = 'Vista: Câmara livre — WASD mover | Roda do rato sobe/desce | ESC: sair';
    } else if (estado.modoCamara === 'ortografica') {
        labelVista.textContent = 'Vista: Side-scroll ortográfica — O/0: alternar | C: Follow Sonic | F: câmara livre';
    } else if (estado.modoSeguirSonic) {
        labelVista.textContent = 'Vista: Follow Sonic — O/0: alternar | C: sair follow | F: câmara livre';
    } else {
        labelVista.textContent = 'Vista: ' + estado.vistaAtual + ' — O/0: side-scroll | C: Follow Sonic | F: câmara livre';
    }
}

function _ativarCamaraLivre() {
    estado.modoCamaraLivre = true;
    var dir = new THREE.Vector3();
    estado.camaraPerspetiva.getWorldDirection(dir);
    estado.camLivreYaw   = Math.atan2(-dir.x, -dir.z);
    estado.camLivrePitch = Math.asin(Math.max(-1, Math.min(1, dir.y)));
    if (estado.modoCamara === 'ortografica') {
        estado.modoCamara = 'perspetiva';
        estado.cameraAtiva = estado.camaraPerspetiva;
    }
    estado.modoSeguirSonic = false;
    estado.vistaAtual = 'Câmara livre';
    estado.renderer.domElement.requestPointerLock();
    _atualizarLabelVista();
}

function _desativarCamaraLivre() {
    estado.modoCamaraLivre = false;
    if (document.pointerLockElement === estado.renderer.domElement) {
        document.exitPointerLock();
    }
    estado.renderer.domElement.style.cursor = 'default';
    _atualizarLabelVista();
}

function _alternarCamaraLivre() {
    if (estado.modoCamaraLivre) _desativarCamaraLivre();
    else _ativarCamaraLivre();
}

function _alternarModoCamara() {
    if (estado.modoCamara === 'perspetiva') {
        estado.modoCamara = 'ortografica';
        estado.cameraAtiva = estado.camaraOrtografica;
    } else {
        estado.modoCamara = 'perspetiva';
        estado.cameraAtiva = estado.camaraPerspetiva;
    }
    var rotY = (estado.modoCamara === 'ortografica') ? Math.PI / 2 : 0;
    if (estado.sol) {
        estado.sol.rotation.y = rotY;
        if (estado.modoCamara === 'ortografica') {
            estado.sol.position.set(-12, 30, 22);
        } else {
            estado.sol.position.set(0, 18, -50);
        }
    }
    for (var i = 0; i < estado.nuvens.length; i++) {
        estado.nuvens[i].rotation.y = rotY;
    }
    _atualizarLabelVista();
}
