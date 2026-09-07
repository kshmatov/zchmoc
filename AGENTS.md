# Цель проекта

Проект в игровой форме учит языку Scheme. Сначала изучается база языка, затем представляется выбор из нескольких проектов на которых изучаются продвинутые темы:
- работа с сетью (TCP, UDP, HTTP)
- интерпретатор Scheme
- работа с базами данных
- многозадачность
- объектно-ориентированное программирование и другие подходы
- etc

Все темы можно проходить в желаемом порядке, если есть пересекующиеся навыки, то это учитывается в изучении последующих тем.

Стек - ожидаю предложений.
Scheme примем в стандарте R6RS.

GUI должен продоставлять возможность писать код непосредственно в нем для простых примеров и загружать более сложные проекты при необходимости.

Обучающая информация выводится текстом.

Проект должен включать в себя интерпретатор языка для проверки кода игрока.

Общение, документация и спеки на русском языке.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues (repo `kshmatov/zchmoc`), managed via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.