import type { UserConfig } from '@shared/types'
import { useMapStore } from './store/mapStore'
import { useUiStore } from './store/uiStore'

/**
 * Applies the persisted user defaults to the initial default map before the
 * first render. Existing documents opened later keep their own styles.
 */
export function applyUserConfigToStores(config: UserConfig): void {
  useUiStore.setState({
    pitchSettings: { ...useUiStore.getState().pitchSettings, ...config.pitch }
  })
  useMapStore.getState().applyUserDefaults(config)
}
