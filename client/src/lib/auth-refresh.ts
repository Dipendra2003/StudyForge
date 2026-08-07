let refreshPromise: Promise<boolean> | null = null;

/**
 * Singleton function to refresh the authentication token.
 * Prevents multiple simultaneous refresh requests if several API calls fail at once.
 */
export async function refreshAuthToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
      .then((res) => res.ok)
      .catch((err) => {

        return false;
      })
      .finally(() => {
        // Clear the promise so future 401s can trigger a new refresh
        refreshPromise = null;
      });
  }

  return refreshPromise;
}
