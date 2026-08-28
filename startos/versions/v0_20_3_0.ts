import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const v_0_20_3_0 = VersionInfo.of({
  version: '0.20.3:0',
  releaseNotes: {
    en_US:
      'Updates Nutshell to 0.20.3, adding P2BK support, asynchronous melts, batched minting, accounting improvements and reliability fixes. This release migrates the mint database — take a fresh backup before updating, because downgrading afterward is not supported.',
    es_ES:
      'Actualiza Nutshell a 0.20.3, añadiendo compatibilidad con P2BK, canjes asíncronos, emisión por lotes, mejoras de contabilidad y correcciones de fiabilidad. Esta versión migra la base de datos de la casa de moneda: haz una copia de seguridad nueva antes de actualizar, porque después no se admite volver a una versión anterior.',
    de_DE:
      'Aktualisiert Nutshell auf 0.20.3 mit P2BK-Unterstützung, asynchronen Einlösungen, gebündelter Prägung, verbesserter Abrechnung und Zuverlässigkeitskorrekturen. Diese Version migriert die Mint-Datenbank – erstelle vorher eine neue Sicherung, denn ein anschließendes Downgrade wird nicht unterstützt.',
    pl_PL:
      'Aktualizuje Nutshell do 0.20.3, dodając obsługę P2BK, asynchroniczne wykupy, wsadową emisję, ulepszenia księgowania i poprawki niezawodności. Ta wersja migruje bazę danych mennicy — przed aktualizacją zrób nową kopię zapasową, ponieważ późniejszy powrót do starszej wersji nie jest obsługiwany.',
    fr_FR:
      "Met Nutshell à jour vers 0.20.3, avec la prise en charge P2BK, les rachats asynchrones, la frappe par lots, des améliorations comptables et des correctifs de fiabilité. Cette version migre la base de données du mint : faites une nouvelle sauvegarde avant de mettre à jour, car le retour à une version antérieure n'est ensuite pas pris en charge.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
