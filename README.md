# Sonic Retro — Three.js

Aplicação gráfica 3D interativa que recria o Green Hill Zone do Sonic clássico (Mega Drive), desenvolvida com Three.js v0.165.0.

---

## Estrutura do Projeto

```
Sonic-CG/
├── index.html                  # Ponto de entrada HTML
├── JavaScript/
│   ├── main.js                 # Orquestrador — inicializa e coordena todos os módulos
│   ├── estado.js               # Estado global partilhado entre módulos
│   ├── ambiente.js             # Objetivo 1 — Setup, Terreno e Skybox
│   ├── objetosComplexos.js     # Objetivo 2 — Looping, Palmeiras e Anéis
│   ├── texturizacao.js         # Objetivo 3 — Texturas e UV Mapping
│   ├── camaras.js              # Objetivo 4 — Sistema de Câmaras
│   ├── iluminacao.js           # Objetivo 5 — Iluminação e Sombras
│   ├── interatividade.js       # Objetivo 6 — Interatividade e Animação
│   ├── finalizacao.js          # Objetivo 7 — Colisões e Elementos de Nível
│   └── appThree.js             # Ficheiro original monolítico (backup)
└── assets/
    ├── loop.glb
    ├── sonic_corpo.glb
    ├── sonic_cabeca.glb
    ├── sonic_bola.glb
    ├── sonic_braco_dir.glb
    ├── sonic_braco_esq.glb
    ├── sonic_perna_dir.glb
    └── sonic_perna_esq.glb
```

---

## Arquitetura de Módulos

O projeto segue uma arquitetura baseada em ES6 modules. Todos os módulos partilham estado através de `estado.js` — um objeto central mutável — evitando dependências circulares entre módulos.

```
three (CDN)
    ↑
estado.js  ←──────────────────────────────────────────┐
    ↑         ↑          ↑          ↑         ↑        │
ambiente  texturizacao  camaras  iluminacao  ...      (todos os módulos)
    ↑         ↑          ↑          ↑         ↑
                        main.js
```

Nenhum módulo importa outro módulo diretamente — todos leem e escrevem em `estado.js`. `main.js` importa tudo e coordena a inicialização e o render loop.

---

## `estado.js` — Estado Global

Exporta o objeto `estado` com todos os campos partilhados, agrupados por módulo proprietário:

| Campo | Proprietário | Descrição |
|---|---|---|
| `cena`, `renderer`, `relogio` | ambiente.js | Core Three.js |
| `camaraPerspetiva`, `camaraOrtografica`, `cameraAtiva`, `modoCamara` | camaras.js | Sistema de câmaras |
| `teclasPremidas`, `modoCamaraLivre`, `modoSeguirSonic` | camaras.js | Estado de input |
| `nuvens[]`, `oceano`, `sol`, `ceu` | ambiente.js | Cenário |
| `aneisDecorativos[]`, `palmeiras[]`, `barcos[]`, `gaivotas[]` | objetosComplexos.js | Objetos animados |
| `carregadorTexturas`, `materiaisFolhas{}`, `tufosRelva[]` | texturizacao.js | Recursos de textura |
| `sonicPlaceholder`, `sonicBola`, `sonicPartes{}` | interatividade.js | Personagem |
| `sonicVidas`, `sonicMorreu`, `sonicInvencivel`, `ultimoCheckpoint` | interatividade.js | Estado de jogo |
| `elementosNivel[]`, `areasColisao[]` | finalizacao.js | Estrutura do nível |
| `_callbacks.sonicMorrer` | — | Callback para evitar importação cruzada |

---

## `main.js` — Orquestrador

Responsável pela ordem de inicialização e pelo render loop principal.

### Ordem de Inicialização (`Start`)

```
inicializarTexturizacao()   → TextureLoader antes de qualquer textura
inicializarAmbiente()       → cena + renderer antes de tudo o resto
inicializarCamaras()        → câmaras + vetores pré-alocados
registarEventosCamara()     → eventos de teclado/rato para câmaras
criarTerreno()
criarSkyboxRetro()
criarIlhasDistantes()
criarBarco()
criarGaivotas()
criarLuzes()
criarLooping()              → async (GLB), não bloqueia
criarVegetacao()
criarAneis()
criarElementosNivel()
inicializarInteratividade() → HUD + input WASD/Espaço
criarSonicPlaceholder()     → async (GLB), não bloqueia
```

### Render Loop (`_loop`)

Chamada por frame, por ordem determinística:

```
atualizarCamaras()          → câmara livre + follow Sonic
atualizarInteratividade()   → física, movimento, animação do Sonic
atualizarFinalizacao()      → colisões + checkpoints
atualizarObjetosComplexos() → anéis, barcos, gaivotas, vegetação
atualizarAmbiente()         → nuvens, ondas do oceano
renderer.render()
```

---

## Objetivo 1 — Setup do Ambiente (`ambiente.js`)

Inicialização da Scene, Renderer e Loop. Criação do chão com padrão de xadrez e Skybox retro.

### Funções Exportadas

| Função | O que faz |
|---|---|
| `inicializarAmbiente()` | Cria `THREE.Scene`, `WebGLRenderer` (sRGB, PCFSoftShadowMap) e `THREE.Clock`. Adiciona o canvas ao DOM com `document.body.appendChild`. |
| `criarTerreno()` | Cria as 4 plataformas com textura xadrez (`_criarSegmentoTerreno`), a praia com perfil elíptico e degradê de cor areia→mar (vertex colors), e o plano do oceano (300×300, 60×60 segmentos, `MeshPhysicalMaterial` translúcido). |
| `criarSkyboxRetro()` | Cria a esfera de céu invertida com `ShaderMaterial` de gradiente azul, o disco do sol (`CircleGeometry`, `MeshBasicMaterial`), e 14 grupos de nuvens (`SphereGeometry` em 3 partes por nuvem). |
| `atualizarAmbiente(delta, tempo)` | Anima o deslocamento das nuvens (X em perspetiva, Z em ortográfica), deforma os vértices do oceano com ondas compostas (radial + direcional + detalhe) sem recalcular normais. |

### Função Privada

| Função | O que faz |
|---|---|
| `_criarSegmentoTerreno(x, z, largX, compZ, altura, elevacao)` | Cria um `BoxGeometry` com a textura xadrez e chama `criarSuperficieRelvaUnificada` (de `texturizacao.js`) para adicionar a camada de relva. |

---

## Objetivo 2 — Objetos Complexos (`objetosComplexos.js`)

Construção do Looping, Palmeiras e Anéis utilizando primitivas e hierarquias de grupos (`THREE.Group`).

### Funções Exportadas

| Função | O que faz |
|---|---|
| `criarLooping()` | Carrega `assets/loop.glb` via `GLTFLoader`. Após carregamento, escala o modelo para altura ≈16 unidades, centra-o em X, e recalcula `estado.LOOP_CY` e `estado.LOOP_RAIO` a partir da bounding box real. Ativa `castShadow`/`receiveShadow` em todos os meshes. |
| `criarPalmeira(posX, posZ, escala)` | Cria uma palmeira tropical com tronco segmentado (9 cilindros com anéis de separação) e 8 folhas em leque (`PlaneGeometry` deformada com droop cúbico). Usa RNG com seed baseada na posição para variação reproduzível. Adiciona ao `estado.palmeiras[]` e `estado.vegetacao[]`. |
| `criarArvoreRamificada(posX, posZ, escala)` | Cria uma árvore com ramificação recursiva 2–3 níveis usando `gerarRamo()` de `texturizacao.js`. Parâmetros de gnarliness, gravidade e escala dos filhos controlam o aspeto orgânico. |
| `criarArbusto(posX, posZ, escala)` | Cria um arbusto com 3–5 caules inclinados (cada um ramificado 1 nível), hull esférico translúcido, flores opcionais e clusters de bagas com ponto de brilho. |
| `criarVegetacao()` | Posiciona palmeiras (`criarPalmeira`) em x=±5 e arbustos (`criarArbusto`) em x=±4 ao longo das 4 plataformas, com escalas variadas. |
| `criarAneis()` | Cria 21 anéis dourados (`TorusGeometry`, `MeshPhysicalMaterial` com metalness=0.9, clearcoat=0.3) com anel interno de brilho (`MeshBasicMaterial`). Popula `estado.aneisDecorativos[]`. |
| `criarIlhasDistantes()` | Cria 13 ilhas low-poly (7 em coordenadas polares + 6 posicionadas) com base de areia, camada de relva, palmeiras (reparentadas à ilha), arbustos, rochas e flores. Usa RNG determinístico por ilha. |
| `criarBarco()` | Cria 2 barcos com casco deformado (proa afilada, fundo arredondado), mastro, verga, vela principal com billow procedural, crow's nest, bandeira ondulada, cordas de rigging, canhões e barris. Armazena `userData` com parâmetros de órbita. |
| `criarGaivotas()` | Cria 6 gaivotas com 2 planos de asa em V (`PlaneGeometry`), cada uma com raio, altura, fase e velocidade próprios em `userData`. |
| `atualizarObjetosComplexos(delta, tempo)` | Roda os anéis em Y, oscila as frondas das palmeiras, move os barcos em órbita circular com bob vertical, anima o voo circular das gaivotas com batimento de asas, e aplica flutter suave às folhas das árvores e arbustos. |

---

## Objetivo 3 — Texturização (`texturizacao.js`)

Aplicação de texturas via `TextureLoader` e mapeamento UV para garantir o aspeto visual clássico.

### Funções Exportadas

| Função | O que faz |
|---|---|
| `inicializarTexturizacao()` | Cria o `THREE.TextureLoader` e carrega `texturaCascaPartilhada` (textura de madeira externa via HTTPS), configurando `RepeatWrapping` e `repeat(1,3)`. |
| `criarTexturaXadrez()` | Gera uma `CanvasTexture` de 512×512 com padrão xadrez 8×8 em tons de laranja/dourado com grelha escura. `RepeatWrapping` com `repeat(8,8)`. |
| `criarTexturaRelva()` | Gera uma `CanvasTexture` de 512×512 com gradiente verde, 3500 manchas de variação de tom, 900 lâminas de relva desenhadas com `quadraticCurveTo`, e reflexos de luz. `RepeatWrapping` com `repeat(6,6)`. |
| `criarTexturaAreia()` | Gera uma `CanvasTexture` de 256×256 com cor base de areia e 1200 grãos de variação de tom com alpha variável. `RepeatWrapping` com `repeat(6,6)`. |
| `inicializarMateriaisTerreno()` | Chama `criarTexturaXadrez()` e cria o `MeshStandardMaterial` do terreno partilhado entre todas as plataformas. |
| `criarSuperficieRelvaUnificada(terrainX, terrainZ, largX, compZ)` | Cria uma base sólida verde (`BoxGeometry`) e lâminas de relva densas como filhos do grupo (`PlaneGeometry` em 3 alturas, 2–3 planos cruzados por tufo). Usa lazy-init de materiais e geometrias partilhados. Popula `estado.tufosRelva[]` com `userData` de posição e fase de brisa. |
| `criarRNG(seed)` | Gerador de números pseudo-aleatórios determinístico (LCG). Retorna objeto com métodos `next()` e `range(min, max)`. |
| `gerarRamo(grupo, origem, orientacao, comprimento, raio, nivel, maxNivel, params, rng)` | Gera um ramo recursivo com `CylinderGeometry` por secção, aplicando gnarliness (desvio aleatório da direção), efeito de gravidade e conicidade progressiva. No nível máximo chama `gerarFolhas()`. |
| `gerarFolhas(grupo, pontosRamo, params, rng)` | Gera clusters de folhas cross-plane (2 `PlaneGeometry` perpendiculares por cluster) com materiais partilhados por cor (`estado.materiaisFolhas`). Cada folha tem `userData.fase` para animação. |
| `deformarFolha(mesh, rng)` | Curva os vértices de uma folha plana para dar curvatura natural (deslocamento Z proporcional ao quadrado da distância ao centro). |

---

## Objetivo 4 — Câmaras (`camaras.js`)

Implementação e alternância dinâmica entre Câmaras (Perspetiva vs. Ortográfica).

### Funções Exportadas

| Função | O que faz |
|---|---|
| `inicializarCamaras()` | Cria a `PerspectiveCamera` (60° FOV) posicionada em (25,12,10), a `OrthographicCamera` (frustum 18u) via `_inicializarCameraOrtografica()`, define `cameraAtiva`, pré-aloca os 5 vetores reutilizáveis do render loop, e cria o `labelVista` no DOM. |
| `registarEventosCamara()` | Regista os eventos `keydown` (teclas O/0/C/F/Escape), `pointerlockchange`, `mousemove` e `wheel` para controlo das câmaras. Separado do input de jogo (WASD/Espaço) que fica em `interatividade.js`. |
| `atualizarDimensoesCamara(largura, altura)` | Atualiza `aspect` da perspetiva e os 4 planos do frustum da ortográfica. Chamado por `main.js` quando `_needsResize` é verdadeiro. |
| `atualizarCamaras(delta)` | Processa o movimento WASD da câmara livre (usando os vetores pré-alocados para evitar GC) e aplica lerp suave da câmara follow-Sonic. |

### Funções Privadas

| Função | O que faz |
|---|---|
| `_inicializarCameraOrtografica()` | Cria a `OrthographicCamera` com frustum proporcional à janela e posicionada para vista lateral. |
| `_atualizarLabelVista()` | Atualiza o texto do HUD de câmara conforme o modo ativo. |
| `_ativarCamaraLivre()` | Calcula yaw/pitch da direção atual, ativa pointer lock e muda para perspetiva. |
| `_desativarCamaraLivre()` | Liberta o pointer lock e restaura o cursor. |
| `_alternarCamaraLivre()` | Alterna entre câmara livre ativa/inativa. |
| `_alternarModoCamara()` | Alterna entre perspetiva e ortográfica, reposicionando sol e nuvens para a vista correta. |

---

## Objetivo 5 — Iluminação (`iluminacao.js`)

Configuração detalhada do sistema de luzes e sombras projetadas (Shadow Mapping).

### Funções Exportadas

| Função | O que faz |
|---|---|
| `criarLuzes()` | Cria uma `AmbientLight` (intensidade 0.45) para iluminação global e uma `DirectionalLight` (cor 0xfff1b8, intensidade 2.0) posicionada em (-5,18,-30). Configura shadow map de 2048×2048 (`PCFSoftShadowMap`), frustum de sombras com far=120 e ±45 unidades em XY. |

---

## Objetivo 6 — Interatividade e Animação (`interatividade.js`)

Programação de controlos de teclado, interface GUI e lógica de animação (percurso no looping e rotação).

### Funções Exportadas

| Função | O que faz |
|---|---|
| `inicializarInteratividade()` | Cria o `labelVidas` no DOM, inicializa `ultimoCheckpoint`, regista o callback `estado._callbacks.sonicMorrer`, e regista os eventos `keydown`/`keyup` para WASD e Espaço (salto/modo bola). |
| `criarSonicPlaceholder()` | Carrega 6 GLBs em paralelo (`sonic_corpo`, `sonic_cabeca`, `sonic_braco_dir`, `sonic_braco_esq`, `sonic_perna_esq`, `sonic_perna_dir`) e, quando todos estão prontos, chama `_montarSonic()`. Carrega também `sonic_bola.glb` separadamente. |
| `atualizarInteratividade(delta, tempo)` | Executa por frame: animação de morte (bounce+spin), piscar de invencibilidade, trigger e física circular do looping, animação sinusoidal dos pivôs dos membros, física de salto (gravidade), movimento WASD com limites de plataforma, e reação dos tufos de relva à proximidade do Sonic. |

### Funções Privadas

| Função | O que faz |
|---|---|
| `_montarSonic(scenes)` | Escala o corpo para altura ≈0.9 unidades, adiciona corpo e cabeça diretamente ao placeholder, e chama `montarMembro()` para braços e pernas. Espelha o braço esquerdo a partir do direito. Corrige a posição Y final para que os pés fiquem em y=0.35. |
| `montarMembro(mesh, chave)` | Calcula a bounding box world do membro para encontrar o ponto da junta (topo), cria um `THREE.Group` pivot nessa posição, e desloca o mesh para que o topo fique em (0,0,0) do pivot. |
| `_tocarAnimacaoSonic(nome, fadeDuracao)` | Procura um clip de animação por nome (case-insensitive), com fallback por índice. Aplica crossfade de entrada/saída. |
| `_atualizarHUD()` | Atualiza o texto do `labelVidas` com corações cheios/vazios conforme `estado.sonicVidas`. |
| `_sonicMorrer()` | Decrementa vidas, ativa estado de morte, lança bounce (velocidadeY=7) e spin. Registado em `estado._callbacks.sonicMorrer` para ser chamável por `finalizacao.js` sem importação cruzada. |
| `_sonicRespawn()` | Restaura estado de vivo, ativa invencibilidade de 2 segundos, repositiona no último checkpoint. Reinicia vidas e checkpoint se morreu sem vidas. |

---

## Objetivo 7 — Finalização (`finalizacao.js`)

Refinamento de colisões, elementos clássicos do nível e lógica de checkpoints.

### Funções Exportadas

| Função | O que faz |
|---|---|
| `criarMola(x, y, z)` | Cria uma mola com base vermelha (`CylinderGeometry`), 4 aros de espiral (`TorusGeometry`) e plataforma amarela no topo. |
| `criarCheckpoint(x, y, z)` | Cria um poste metálico com esfera azul no topo e base alargada. Adiciona a `estado.elementosNivel[]` com tipo `'checkpoint'`. |
| `criarPonte(x, y, z, comprimento, numTabuas, largura)` | Cria uma ponte suspensa com cordas laterais (`CylinderGeometry`), tábuas de madeira (`BoxGeometry`) com sombras, postes verticais em ambos os lados e dois corrimãos horizontais (topo e meio). |
| `criarTapeteVelocidade(x, y, z)` | Cria uma placa dourada emissiva com 3 setas apontadas em –Z, cada uma com haste e ponta cónica. |
| `criarFloresChao(x, y, z, numFlores)` | Cria um grupo de flores com caule, centro amarelo e 5 pétalas circulares. Usa lazy-init de materiais e geometrias partilhados por todas as flores da cena. |
| `criarPlacaFinal(x, y, z)` | Cria o Goal Post com poste prateado, placa azul e estrela dourada. Adiciona a `estado.elementosNivel[]` com tipo `'placaFinal'`. |
| `criarPicos(x, y, z, opcoes)` | Cria um conjunto de picos metálicos sobre uma base vermelha, com um colisor invisível (`visible: false`) que é adicionado a `estado.areasColisao[]` para deteção de colisão por `Box3`. |
| `criarElementosNivel()` | Posiciona todos os elementos ao longo das 4 plataformas: picos+mola na Plat1, checkpoint+picos+checkpoint na Plat2, picos+mola na Plat3, placa final na Plat4, pontes nos espaços, e flores simétricas em todas as plataformas. |
| `atualizarFinalizacao(delta)` | Verifica colisão AABB (`Box3.intersectsBox`) entre o Sonic/bola e cada área de colisão de picos, chamando `estado._callbacks.sonicMorrer()` se colidir. Deteta proximidade (<3 unidades) de checkpoints e atualiza `estado.ultimoCheckpoint`. |

---

## Controlos

| Tecla | Ação |
|---|---|
| `W / A / S / D` | Mover Sonic |
| `Espaço` | Saltar / Sair do modo bola |
| `O` ou `0` | Alternar Perspetiva ↔ Ortográfica |
| `C` | Ativar/desativar Follow Sonic |
| `F` | Ativar câmara livre |
| `ESC` | Sair da câmara livre |
| `Rato` (câmara livre) | Olhar em volta (pointer lock) |
| `Roda do rato` (câmara livre) | Subir/descer |

---

## Tecnologias

- **Three.js v0.165.0** via CDN (unpkg) com importmap
- **ES6 Modules** nativos no browser — sem build system necessário
- **WebGL** com renderer sRGB e shadow maps PCFSoft
- **GLTF/GLB** para modelos 3D (Sonic e loop)
- **Canvas 2D API** para texturas procedurais
