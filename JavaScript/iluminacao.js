// iluminacao.js — Objetivo 5: AmbientLight, DirectionalLight, PointLight e toggles por tecla
import * as THREE from 'three';
import { estado } from './estado.js';

var _painel = null;

export function criarLuzes() {
    var luzAmbiente = new THREE.AmbientLight(0xffffff, 0.45);
    estado.cena.add(luzAmbiente);
    estado.luzes.ambiente = luzAmbiente;

    var luzDirecional = new THREE.DirectionalLight(0xfff1b8, 2.0);
    luzDirecional.position.set(-5, 18, -30);
    luzDirecional.castShadow = true;
    luzDirecional.shadow.mapSize.width  = 1024;
    luzDirecional.shadow.mapSize.height = 1024;
    luzDirecional.shadow.camera.near   = 0.5;
    luzDirecional.shadow.camera.far    = 120;
    luzDirecional.shadow.camera.left   = -45;
    luzDirecional.shadow.camera.right  =  45;
    luzDirecional.shadow.camera.top    =  45;
    luzDirecional.shadow.camera.bottom = -45;
    estado.cena.add(luzDirecional);
    estado.luzes.direcional = luzDirecional;

    // Tocha de praia — luz pontual laranja-quente na zona inicial
    var luzPontual = new THREE.PointLight(0xff9940, 15, 30);
    luzPontual.position.set(0, 4, 15);
    luzPontual.castShadow = false;
    estado.cena.add(luzPontual);
    estado.luzes.pontual = luzPontual;

    _criarPainelHUD();
    document.addEventListener('keydown', _onTeclaLuz);
}

function _onTeclaLuz(evento) {
    if (evento.key === '1') {
        estado.luzes.ambiente.visible = !estado.luzes.ambiente.visible;
        _atualizarPainelHUD();
    } else if (evento.key === '2') {
        estado.luzes.direcional.visible = !estado.luzes.direcional.visible;
        _atualizarPainelHUD();
    } else if (evento.key === '3') {
        estado.luzes.pontual.visible = !estado.luzes.pontual.visible;
        _atualizarPainelHUD();
    }
}

function _criarPainelHUD() {
    _painel = document.createElement('div');
    _painel.style.cssText = [
        'position:fixed',
        'bottom:10px',
        'left:10px',
        'z-index:100',
        'background:rgba(0,0,0,0.7)',
        'color:#fff',
        'font-family:monospace',
        'font-size:13px',
        'padding:6px 10px',
        'border-radius:4px',
        'pointer-events:none',
        'user-select:none'
    ].join(';');
    document.body.appendChild(_painel);
    _atualizarPainelHUD();
}

function _atualizarPainelHUD() {
    function indicador(luz) {
        return luz.visible
            ? '<span style="color:#7fff7f">&#9679;</span>'
            : '<span style="color:#777">&#9675;</span>';
    }
    _painel.innerHTML =
        'Luzes: [1]&nbsp;AmbientLight&nbsp;' + indicador(estado.luzes.ambiente) +
        '&nbsp;|&nbsp;[2]&nbsp;DirectionalLight&nbsp;' + indicador(estado.luzes.direcional) +
        '&nbsp;|&nbsp;[3]&nbsp;PointLight&nbsp;' + indicador(estado.luzes.pontual);
}
