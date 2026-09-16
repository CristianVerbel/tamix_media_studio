import * as React from 'react';

import { useApiResource } from './useApiResource';
import { tamixApi } from '@/lib/tamixApi';
import type { Gestion } from '@/types/tamix';

/** Rol y estado de automatización para la cuenta activa, la autoridad de todo el gateo de UI. */
export function useGestion(handle: string | null) {
  const fetcher = React.useCallback(() => {
    if (!handle) return Promise.reject(new Error('Sin cuenta activa'));
    return tamixApi.gestion(handle);
  }, [handle]);

  return useApiResource<Gestion>(fetcher, [handle]);
}
