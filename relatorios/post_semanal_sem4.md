# Post Semanal — Semana 4 (4–11 Mai)
## Projeto: Sonic Retro — Green Hill Zone (Three.js)
**Grupo:** Daniel Barros (AL73561) | Bernardo Goncalves (AL79170) | Pedro Miguel (AL76328)

---

## 1. Progresso Realizado na Semana (por aluno)

### Daniel Barros (AL73561)

- **Sistema de 8 presets de camara perspetiva** (teclas 1-8), cada um com posicao e alvo distintos:
  - `1` Vista geral 3/4 | `2`/`3` Lado direito/esquerdo | `4` Topo (vista aerea)
  - `5` Inicio do nivel | `6` Vista do loop | `7` Final do nivel | `8` Frente (side-scroll)
- **Camara Follow (3a pessoa)** ativada com tecla `C`: a camara segue dinamicamente o Sonic com interpolacao suave (`lerp`, fator 0.08), mantendo-se atras e acima do personagem.
- **HUD de camara**: label no ecra que indica a vista atual e as teclas disponiveis, atualizado automaticamente ao alternar.
- **Modelo Sonic hibrido (primitivas + GLB)**:
  - Corpo procedural com `SphereGeometry`, `CylinderGeometry`, `TorusGeometry` (corpo, barriga, bracos, pernas, luvas).
  - Cabeca GLB (`sonic_head.glb`) carregada via `GLTFLoader`, escalada e posicionada no topo do corpo.
  - Sapatos GLB (`sonic_sapatos.glb`) — par completo, escalado para separacao simetrica alinhada com as pernas.
  - Hierarquia de grupos (`THREE.Group`) para mover o personagem inteiro.
- **Modo Bola** (tecla Espaco): carrega `sonic_bola.glb`, alterna visibilidade entre Sonic normal e bola, com escala automatica via `BoundingBox` e rolamento visual em `rotation.z`.
- **Controlos WASD**: movimento do Sonic pelo cenario (velocidade `8 * delta`), limites de posicao (`x: +/-5`, `z: +/-36`), rotacao automatica na direcao do movimento via `Math.atan2`.
- **Iluminacao e Shadow Mapping** (adiantado face a Sem. 5):
  - `AmbientLight` (intensidade 0.45) + `DirectionalLight` (intensidade 2.0, cor quente `0xfff1b8`).
  - Sombras: `shadow.mapSize` 2048x2048, `PCFSoftShadowMap`, frustum configurado (`near 0.5`, `far 120`, limites +/-45).
  - Todas as geometrias (terreno, looping, vegetacao, Sonic) com `castShadow`/`receiveShadow` ativos.

### Bernardo Goncalves (AL79170)

- **Camara Ortografica** (`OrthographicCamera`) implementada em `appThree.js` com funcao `inicializarCameraOrtografica()`.
- Configuracao side-scroll 2D fixo: `position.set(30, 12, 0)` e `lookAt(0, 3, 0)`.
- **Alternancia Perspetiva <-> Ortografica** via teclas `O`, `o` ou `0`, com funcao `alternarModoCamara()`.
- **Legendas dinamicas** na interface para mostrar o modo de camara ativo via `atualizarLabelVista()`.

### Pedro Miguel (AL76328)

- Apoio na construcao e teste do cenario (terreno, vegetacao, elementos classicos).
- Revisao e validacao visual dos modelos GLB integrados (cabeca, sapatos, bola).
- Testes de alternancia de camaras e comportamento dos controlos WASD em diferentes vistas.

---

## 2. Desvios face a Planificacao

| Planificado (Sem. 4) | Realizado | Desvio |
|-----------------------|-----------|--------|
| Camara Perspetiva | Implementada com 8 presets + follow mode (tecla C) | Cumprido e excedido (8 presets nao estavam planeados) |
| Camara Ortografica | Implementada com alternancia via tecla O/0 e modo side-scroll fixo | Cumprido — falta tracking dinamico do personagem no modo ortografico |
| Alternancia dinamica | Toggle Perspetiva <-> Ortografica funcional | Cumprido |
| **Iluminacao (Sem. 5)** | **Ja implementada**: AmbientLight + DirectionalLight com Shadow Mapping (2048x2048, PCFSoftShadowMap) | **Adiantado** — trabalho previsto para Sem. 5 ja esta funcional |
| **Controlos WASD (Sem. 6)** | **Ja implementados**: movimento WASD, rotacao automatica, modo bola com Espaco | **Adiantado** — trabalho previsto para Sem. 6 ja esta parcialmente feito |
| Modelo Sonic com GLB | Modelo hibrido completo (primitivas + 3 GLBs) com modo bola | Nao planeado para esta semana — trabalho extra realizado |

---

## 3. Auto-Avaliacao do Progresso Semanal

### Daniel Barros (AL73561)
Progresso **muito positivo**. Alem do objetivo da semana (camaras), adiantei significativamente trabalho das Sem. 5 e 6: iluminacao com shadow mapping completa, controlos WASD funcionais, modelo Sonic hibrido com 3 assets GLB e modo bola. Area a melhorar: o rolamento da bola no eixo frente-tras (W/S) ainda apresenta gimbal lock — sera resolvido na Sem. 5/6.

### Bernardo Goncalves (AL79170)
Progresso **positivo**. Objetivo principal cumprido: camara ortografica implementada e alternancia funcional por tecla. O modo ortografico esta atualmente estatico — falta tracking do personagem e resposta a resize da janela, que serao consolidados na proxima semana.

### Pedro Miguel (AL76328)
Progresso **satisfatorio**. Contribuicao no teste e validacao dos modelos e camaras. Na proxima semana assumira tarefas de implementacao mais autonomas na area da iluminacao.

---

## 4. Evidencias dos Progressos

### Codigo — Presets de Camara e Follow (`appThree.js`)

```javascript
// 8 presets de camara (teclas 1-8)
var presetsCamara = {
    '1': { pos: [25, 12, 10],  alvo: [0, 3, 0],   nome: 'Vista geral (3/4)' },
    '2': { pos: [30, 8, 0],    alvo: [0, 4, 0],   nome: 'Lado direito' },
    '3': { pos: [-30, 8, 0],   alvo: [0, 4, 0],   nome: 'Lado esquerdo' },
    '4': { pos: [0, 40, 1],    alvo: [0, 0, 0],   nome: 'Topo (vista aerea)' },
    // ... mais 4 presets
};

// Camara follow com interpolacao suave
if (modoSeguirSonic && alvoSeguir) {
    var sp = alvoSeguir.position;
    var alvoPos = new THREE.Vector3(sp.x, sp.y + 6, sp.z + 14);
    camaraPerspetiva.position.lerp(alvoPos, 0.08);
    camaraPerspetiva.lookAt(sp.x, sp.y + 1, sp.z);
}
```

### Codigo — Camara Ortografica e Alternancia (`appThree.js`)

```javascript
// Inicializacao da camara ortografica (side-scroll 2D)
function inicializarCameraOrtografica() { ... }

// Alternancia entre modos de camara
function alternarModoCamara() { ... }

// Evento de teclado
if (tecla === 'o' || tecla === 'O' || tecla === '0') alternarModoCamara();
```

### Codigo — Modelo Sonic com GLB (`appThree.js`)

```javascript
// Cabeca GLB
carregadorGLTF.load('assets/sonic_head.glb', function(gltf) {
    var cabecaGLB = gltf.scene;
    cabecaGLB.scale.setScalar(0.028);
    cabecaGLB.position.set(0.25, 0.30, 0);
    sonicPlaceholder.add(cabecaGLB);
});

// Modo Bola (Espaco)
if (evento.code === 'Space' && sonicPlaceholder && sonicBola) {
    modoBola = !modoBola;
    sonicPlaceholder.visible = !modoBola;
    sonicBola.visible = modoBola;
}
```

### Codigo — Iluminacao com Shadow Mapping (`appThree.js`)

```javascript
var luzDirecional = new THREE.DirectionalLight(0xfff1b8, 2.0);
luzDirecional.castShadow = true;
luzDirecional.shadow.mapSize.width = 2048;
luzDirecional.shadow.mapSize.height = 2048;
luzDirecional.shadow.camera.near = 0.5;
luzDirecional.shadow.camera.far = 120;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
```

### Assets GLB integrados
- `assets/sonic_head.glb` — cabeca do Sonic
- `assets/sonic_sapatos.glb` — par de sapatos
- `assets/sonic_bola.glb` — forma de bola (spin dash)

---

## 5. Planificacao das Semanas Seguintes

### Sem. 5 (11–18 Mai) — Iluminacao: Configuracao detalhada do sistema de luzes e sombras projetadas

> **Nota:** A base de iluminacao (AmbientLight + DirectionalLight + Shadow Mapping) ja esta implementada. Esta semana foca-se em **expandir e refinar** o sistema.

| Tarefa | Responsavel | Descricao | Estado |
|--------|-------------|-----------|--------|
| PointLight no Sonic | Daniel Barros | Luz pontual que acompanha o Sonic para iluminacao localizada dinamica | Pendente |
| SpotLight no looping | Daniel Barros | Focos direcionais nas entradas/saida do looping com sombras proprias | Pendente |
| HemisphereLight | Bernardo Goncalves | Substituir/complementar `AmbientLight` com `HemisphereLight` (ceu azul + chao verde) | Pendente |
| Tracking ortografico | Bernardo Goncalves | Camara ortografica segue o Sonic (side-scroll dinamico) + resposta a resize | Pendente |
| Ajuste de sombras | Pedro Miguel | Refinar frustum da `DirectionalLight`, testar `shadow.bias`, eliminar artefactos | Pendente |
| Luzes decorativas | Pedro Miguel | Adicionar luzes ambiente nos aneis (emissive glow) e na zona da praia/oceano | Pendente |

### Sem. 6 (18–25 Mai) — Interatividade e Animacao: Controlos, GUI e logica de animacao

> **Nota:** Os controlos WASD e modo bola ja estao parcialmente implementados. Esta semana foca-se em **completar e polir** a interatividade.

| Tarefa | Responsavel | Descricao | Estado |
|--------|-------------|-----------|--------|
| Fix rolamento bola W/S | Daniel Barros | Resolver gimbal lock com quaternions para rolamento correto em todas as direcoes | Em progresso |
| Animacao percurso looping | Daniel Barros | Sonic percorre automaticamente o looping via `CatmullRomCurve3.getPointAt()` | Pendente |
| Interface GUI (lil-gui) | Bernardo Goncalves | Painel com controlo de velocidade, intensidade de luzes, visibilidade de objetos | Pendente |
| Transicao suave camaras | Bernardo Goncalves | Animacao de transicao ao alternar entre perspetiva e ortografica | Pendente |
| Colisao com aneis | Pedro Miguel | Detecao de proximidade Sonic-aneis com feedback visual (desaparecer + efeito) | Pendente |
| Animacao de idle + som | Pedro Miguel | Movimento subtil do Sonic quando parado (breathing/balanco) e efeitos sonoros basicos | Pendente |
