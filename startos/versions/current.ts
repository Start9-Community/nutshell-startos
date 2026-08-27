import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { legacyLightningBackend } from '../lightningBackend'

export const current = VersionInfo.of({
  version: '0.20.3:1',
  releaseNotes: {
    en_US:
      'Adds one-time Lightning backend selection between Core Lightning (CLNRest) and LND (REST). Existing mints are locked to CLN during update; fresh installations choose once and cannot switch afterward.',
    es_ES:
      'Añade una selección única del backend Lightning entre Core Lightning (CLNRest) y LND (REST). Las casas de moneda existentes se bloquean en CLN durante la actualización; las instalaciones nuevas eligen una vez y después no pueden cambiar.',
    de_DE:
      'Fügt eine einmalige Auswahl des Lightning-Backends zwischen Core Lightning (CLNRest) und LND (REST) hinzu. Bestehende Mints werden beim Update auf CLN festgelegt; Neuinstallationen wählen einmalig und können danach nicht wechseln.',
    pl_PL:
      'Dodaje jednorazowy wybór backendu Lightning między Core Lightning (CLNRest) a LND (REST). Istniejące mennice zostaną podczas aktualizacji przypisane do CLN; nowe instalacje wybierają raz i nie mogą później zmienić wyboru.',
    fr_FR:
      "Ajoute un choix unique du backend Lightning entre Core Lightning (CLNRest) et LND (REST). Les mints existants sont verrouillés sur CLN lors de la mise à jour ; les nouvelles installations choisissent une fois et ne peuvent plus changer ensuite.",
  },
  migrations: {
    up: async ({ effects }) => {
      await storeJson.merge(effects, {
        lightningBackend: legacyLightningBackend(),
      })
    },
    down: IMPOSSIBLE,
  },
})
