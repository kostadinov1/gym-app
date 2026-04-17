import { useEffect, useState } from 'react';
import { SyncService, type SyncStatus } from '../services/SyncService';

/**
 * Subscribe to SyncService status updates.
 *
 * Returns the current sync state and a `trigger` function to manually kick
 * off a sync cycle. Safe to call on ghost users — status will be the idle
 * default and trigger() is a no-op because SyncService was never started.
 *
 * @example
 * const { isSyncing, pendingCount, lastSyncedAt, trigger } = useSyncStatus();
 */
export function useSyncStatus(): SyncStatus & { trigger: () => void } {
  const [status, setStatus] = useState<SyncStatus>(SyncService.getStatus);

  useEffect(() => {
    const unsubscribe = SyncService.subscribe(setStatus);
    return unsubscribe;
  }, []);

  return { ...status, trigger: SyncService.trigger };
}
