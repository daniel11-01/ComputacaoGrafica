// iluminacao.js — Objetivo 5: AmbientLight, DirectionalLight e Shadow Mapping
import * as THREE from 'three';
import { estado } from './estado.js';

export function criarLuzes() {
    var luzAmbiente = new THREE.AmbientLight(0xffffff, 0.45);
    estado.cena.add(luzAmbiente);

    var luzDirecional = new THREE.DirectionalLight(0xfff1b8, 2.0);
    luzDirecional.position.set(-5, 18, -30);
    luzDirecional.castShadow = true;
    luzDirecional.shadow.mapSize.width  = 2048;
    luzDirecional.shadow.mapSize.height = 2048;
    luzDirecional.shadow.camera.near   = 0.5;
    luzDirecional.shadow.camera.far    = 120;
    luzDirecional.shadow.camera.left   = -45;
    luzDirecional.shadow.camera.right  =  45;
    luzDirecional.shadow.camera.top    =  45;
    luzDirecional.shadow.camera.bottom = -45;
    estado.cena.add(luzDirecional);
}
