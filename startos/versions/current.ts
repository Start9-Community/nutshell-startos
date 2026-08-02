import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { PACKAGE_VERSION, UPSTREAM_VERSION } from '../upstream'

const upstreamNotes = `https://github.com/cashubtc/nutshell/releases/tag/${UPSTREAM_VERSION}`

export const current = VersionInfo.of({
  version: PACKAGE_VERSION,
  releaseNotes: {
    en_US: `Updates Nutshell to ${UPSTREAM_VERSION} with P2BK support, asynchronous melts, batched minting, accounting improvements, and reliability fixes.

This release migrates the mint database. Create a fresh StartOS backup before updating. Downgrading afterward is not supported.

[Full upstream release notes](${upstreamNotes})`,
    es_ES: `Actualiza Nutshell a ${UPSTREAM_VERSION} con compatibilidad P2BK, pagos asíncronos, acuñación por lotes, mejoras de contabilidad y correcciones de fiabilidad.

Esta versión migra la base de datos de la casa de moneda. Cree una copia de seguridad nueva de StartOS antes de actualizar. No se admite volver a una versión anterior.

[Notas completas de la versión](${upstreamNotes})`,
    de_DE: `Aktualisiert Nutshell auf ${UPSTREAM_VERSION} mit P2BK-Unterstützung, asynchronen Melts, gebündeltem Minting, verbesserter Abrechnung und Zuverlässigkeitskorrekturen.

Diese Version migriert die Mint-Datenbank. Erstellen Sie vor dem Update eine neue StartOS-Sicherung. Ein anschließendes Downgrade wird nicht unterstützt.

[Vollständige Versionshinweise](${upstreamNotes})`,
    pl_PL: `Aktualizuje Nutshell do ${UPSTREAM_VERSION}, dodając obsługę P2BK, asynchroniczne wypłaty, wsadowe mintowanie, ulepszenia księgowania i poprawki niezawodności.

Ta wersja migruje bazę danych mennicy. Przed aktualizacją utwórz nową kopię zapasową StartOS. Późniejszy powrót do starszej wersji nie jest obsługiwany.

[Pełne informacje o wydaniu](${upstreamNotes})`,
    fr_FR: `Met Nutshell à jour vers ${UPSTREAM_VERSION} avec la prise en charge P2BK, les melts asynchrones, la frappe par lots, des améliorations comptables et des correctifs de fiabilité.

Cette version migre la base de données du mint. Créez une nouvelle sauvegarde StartOS avant la mise à jour. Le retour à une version antérieure n'est ensuite pas pris en charge.

[Notes de version complètes](${upstreamNotes})`,
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})
