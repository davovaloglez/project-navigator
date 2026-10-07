# Documentación — Project Navigator

Este directorio centraliza toda la documentación de **Project Navigator**, el tablero interno de gestión de portafolio de Vortex IT.

La documentación está dividida por audiencia:

| Audiencia | Carpeta | Cuándo entrar |
|---|---|---|
| **Usuarios finales** (PMs, dirección, miembros del equipo que consultan el tablero) | [user/](user/) | Cuando quieres saber **qué muestra cada pantalla, qué significan los números y cómo navegar**. Sin tecnicismos. |
| **Desarrolladores** (mantenimiento del código, onboarding técnico) | [dev/](dev/) | Cuando quieres saber **cómo está construido**: arquitectura, reglas de negocio, fórmulas, contratos de datos y convenciones. |
| **Quien evalúa una decisión** (PM/PO, líderes técnicos) | [investigaciones/](investigaciones/) | Cuando quieres el **razonamiento detrás de una decisión**: spikes, evaluación de integraciones, comparativas de opciones con trade-offs. Documentos con fecha. |

Además existe [PROYECTO.md](PROYECTO.md), un documento de referencia general (mezcla de visión + arquitectura). Sirve como introducción rápida al proyecto cuando no sabes por dónde empezar.

Para mantener y extender esta documentación, lee [COMO-DOCUMENTAR.md](COMO-DOCUMENTAR.md): convenciones de estilo, templates por tipo (sección, util, hook, API, componente), validadores y checklists.

## Mapa rápido

```
documentation/
├── README.md                    ← estás aquí
├── PROYECTO.md                  ← visión general + arquitectura resumida
│
├── user/                        ← guía para usuarios finales
│   ├── README.md
│   └── secciones/               ← una guía por sección del tablero
│
├── dev/                         ← documentación técnica
│   ├── README.md
│   ├── arquitectura/            ← cómo está construido el sistema
│   ├── secciones/               ← lógica y reglas de negocio por sección
│   ├── api/                     ← endpoints SSR y contratos de Sheets
│   ├── utils/                   ← motores de cálculo (forecast, costos, health…)
│   ├── hooks/                   ← hooks de React reutilizables
│   └── componentes/             ← UI compartida y charts
│
└── investigaciones/             ← reportes de spikes y decisiones (con fecha)
    └── README.md
```

## Convenciones de esta documentación

- **Idioma:** español. Términos técnicos en inglés cuando son nombres propios del código (`useSheetData`, `WeeklySnapshot`, etc.).
- **Enlaces a código:** rutas relativas desde la raíz del repo, formato Markdown estándar (`[Archivo](src/...)`).
- **Source of truth:** el código siempre gana. Si esta documentación contradice el código, abre un PR para actualizarla.
- **Glosario in-product:** la página [/glosario](../src/pages/glosario.astro) (149 entradas) sigue siendo el catálogo vivo de KPIs y bloques visuales. Esta documentación cubre el "cómo" estructural; el glosario cubre el "qué" de cada métrica.
