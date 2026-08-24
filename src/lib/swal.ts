import Swal from 'sweetalert2';
import { useStore } from './store';

/**
 * SweetAlert2 appends its popup directly to <body>, outside the app's own
 * dir="rtl"/dir="ltr" wrapper divs — so it always fell back to the browser's
 * default (LTR), even when the dialog's text is Hebrew. That's what made
 * punctuation like the trailing "?" in "?מחוק אירוע" end up on the wrong
 * side. This wraps every Swal.fire() call with the current locale's
 * direction, read straight from the store (works even for the couple of
 * call sites outside React component scope).
 */
export default Swal.mixin({
  didOpen: (popup) => {
    const locale = useStore.getState().locale;
    popup.setAttribute('dir', locale === 'he' ? 'rtl' : 'ltr');
  },
});
