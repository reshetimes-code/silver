import Swal from './swal';
import { useStore } from './store';

/**
 * Shared "something failed" handling for any page/action in the app.
 * Shows a clear, localized, actionable message (check connection, retry,
 * contact support if it persists) instead of leaving the user stuck with
 * no feedback. See withErrorAlert() for wrapping a whole action.
 */
export async function showActionError(err: unknown) {
  console.error(err);
  const locale = useStore.getState().locale;
  const he = locale === 'he';
  const detail = err instanceof Error && err.message ? err.message : '';
  await Swal.fire({
    icon: 'error',
    title: he ? 'הפעולה נכשלה' : 'Action failed',
    text: he
      ? `${detail ? detail + '. ' : ''}בדוק את החיבור לאינטרנט ונסה שוב. אם זה ממשיך לקרות, פנה לתמיכה.`
      : `${detail ? detail + '. ' : ''}Check your internet connection and try again. If this keeps happening, contact support.`,
    background: '#0a0a0a', color: '#fff', confirmButtonColor: '#D4AF37',
  });
}

/**
 * Runs fn() and, on failure, shows showActionError() instead of letting the
 * error disappear as an unhandled rejection. Returns undefined on failure —
 * callers that need to distinguish success from failure should put their
 * "on success" logic inside fn() itself rather than checking the return value.
 */
export async function withErrorAlert<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch (err) {
    await showActionError(err);
    return undefined;
  }
}
