import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSyncStatus } from './useSyncStatus';

/**
 * Invalidates all React Query caches whenever a sync cycle completes.
 *
 * SyncService writes data directly to SQLite — React Query doesn't know
 * the underlying data changed. This hook detects the trailing edge of a
 * sync cycle (isSyncing: true → false) and triggers a full cache invalidation
 * so every active query re-fetches from the updated SQLite.
 *
 * Mount once at the app root, inside QueryClientProvider.
 */
export function useSyncQueryInvalidator(): void {
  const queryClient  = useQueryClient();
  const { isSyncing } = useSyncStatus();
  const prevSyncing  = useRef(false);

  useEffect(() => {
    if (prevSyncing.current && !isSyncing) {
      // Sync just finished — tell React Query all cached data is stale.
      queryClient.invalidateQueries();
    }
    prevSyncing.current = isSyncing;
  }, [isSyncing, queryClient]);
}
