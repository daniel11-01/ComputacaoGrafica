# Proposta de Trabalho Prático: Retro Gaming – Sonic

## 1. Introdução e Inspiração

O projeto consiste no desenvolvimento de uma aplicação gráfica interativa no browser utilizando a biblioteca **Three.js**. A temática escolhida é o *"Retro Gaming"*, focando-se na recriação 3D de elementos icónicos da franquia *Sonic the Hedgehog* (especificamente os títulos da era Mega Drive: Sonic 1, 2 e CD). O objetivo é demonstrar conceitos de computação gráfica como hierarquia de objetos, iluminação dinâmica e transições de câmara através de um diorama interativo da *"Green Hill Zone"*.

## 2. Especificações Técnicas (Scene Graph & Assets)

### 2.1 Cenário e Geometria

O ambiente será construído utilizando o conceito de **Scene Graph**, organizando primitivas em grupos para criar objetos complexos:

- **O Looping:** A peça central do cenário. Será desenvolvida uma geometria complexa baseada em `TorusGeometry` (segmentada e rotacionada) ou através da extrusão de um caminho definido por uma `CatmullRomCurve3`, criando uma pista circular contínua.
- **Palmeiras Retro:** Construídas através de `THREE.Group`. O tronco será uma pilha de `CylinderGeometry` com variações de rotação para um aspeto orgânico. As folhas serão `PlaneGeometry` deformadas, utilizando `alphaMap` para garantir a transparência do recorte da folha.
- **Anéis (Rings):** Implementados com `TorusGeometry` e um material `MeshPhysicalMaterial` com propriedades metálicas e reflexivas (*Metalness*/*Roughness*) para simular o brilho do ouro.
- **Sonic:** Representado por uma esfera (`SphereGeometry`) com uma textura que simula o movimento de rotação rápido (*spin dash*) quando em deslocação.

### 2.2 Configuração de Câmaras (Requisito 2)

A aplicação permitirá alternar em tempo real entre dois modos de visualização:

- **Câmara de Perspetiva:** Uma câmara de acompanhamento (3ª pessoa) que segue o movimento do Sonic, permitindo ver a profundidade do looping e do cenário.
- **Câmara Ortográfica:** Uma vista lateral fixa que replica o estilo *side-scrolling* 2D original, ideal para demonstrar a ausência de perspetiva linear.

### 2.3 Iluminação e Materiais (Requisito 3)

- **Luz Global:** Uma `DirectionalLight` amarelada para simular o sol, configurada para projetar sombras (`castShadow`) em tempo real.
- **Luzes de Destaque:** Uso de `PointLight` ou `SpotLight` posicionadas estrategicamente sobre os anéis e dentro do looping para realçar os materiais metálicos.
- **Interatividade:** Todas as luzes poderão ser ligadas/desligadas individualmente através da interface.

### 2.4 Interação e Animação (Requisitos 4 e 5)

- **Controlo:** O utilizador poderá movimentar o personagem e controlar a velocidade através do teclado.
- **GUI:** Integração da biblioteca `lil-gui` para permitir ao utilizador alterar materiais (ex: mudar para modo *Wireframe*) e ajustar intensidades de luz.
- **Animação:** Rotação constante dos anéis e movimento do personagem ao longo de curvas matemáticas para garantir fluidez constante (usando `THREE.Clock`).

## 3. Calendarização (13 de Abril a 1 de Junho)

| Semana | Datas | Objetivos |
| --- | --- | --- |
| **Sem. 0/1** | 13 – 20 Abr | Setup do ambiente: Inicialização da Scene, Renderer e Loop. Criação do chão com padrão de xadrez e Skybox retro. |
| **Sem. 2** | 20 – 27 Abr | Objetos complexos: Construção do Looping, Palmeiras e Anéis utilizando primitivas e hierarquias de grupos (`THREE.Group`). |
| **Sem. 3** | 27 Abr – 4 Mai | Texturização: Aplicação de texturas via `TextureLoader` e mapeamento UV para garantir o aspeto visual clássico. |
| **Sem. 4** | 4 – 11 Mai | Câmaras: Implementação e alternância dinâmica entre Câmaras (Perspetiva vs. Ortográfica). |
| **Sem. 5** | 11 – 18 Mai | Iluminação: Configuração detalhada do sistema de luzes e sombras projetadas (Shadow Mapping). |
| **Sem. 6** | 18 – 25 Mai | Interatividade e Animação: Programação de controlos de teclado, interface GUI e lógica de animação (percurso no looping e rotação). |
| **Sem. 7** | 25 Mai – 1 Jun | Finalização: Refinamento de colisões, otimização, relatório técnico, gravação da demonstração e submissão final. |