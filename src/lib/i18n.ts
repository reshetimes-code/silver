export type Locale = 'en' | 'he';

export const translations = {
  en: {
    // Landing
    welcome: 'Welcome to',
    photobooth: 'PHOTOBOOTH',
    scanQR: 'Scan the QR code to get started!',

    // Capture
    takePhoto: 'Take a Photo',
    uploadPhoto: 'Upload Photo',
    switchCamera: 'Switch Camera',
    capture: 'Capture',
    retake: 'Retake',
    usePhoto: 'Use This Photo',

    // Preview
    preview: 'Preview',
    print: 'Print',
    back: 'Back',

    // Print
    printSent: 'Photo Sent to Print!',
    printMessage: 'Your photo has been sent to the printer. Pick it up at the booth!',
    printAnother: 'Print Another Photo',
    remainingPrints: 'Remaining prints',
    noPrintsLeft: 'No prints remaining',
    maxPrintsReached: 'You have reached the maximum number of prints for this event.',

    // Admin
    admin: 'Admin Dashboard',
    createEvent: 'Create Event',
    eventName: 'Event Name',
    eventDate: 'Event Date',
    selectTemplate: 'Select Template',
    overlayText: 'Overlay Text',
    maxPrints: 'Max Prints Per Device',
    save: 'Save',
    cancel: 'Cancel',
    events: 'Events',
    active: 'Active',
    inactive: 'Inactive',
    printQueue: 'Print Queue',
    totalPhotos: 'Total Photos',
    qrCode: 'QR Code',
    deleteEvent: 'Delete Event',
    editEvent: 'Edit Event',

    // Common
    loading: 'Loading...',
    error: 'Something went wrong',
    switchLang: 'HEB',
  },
  he: {
    // Landing
    welcome: 'ברוכים הבאים ל',
    photobooth: 'פוטובות\'',
    scanQR: 'סרקו את קוד ה-QR כדי להתחיל!',

    // Capture
    takePhoto: 'צלם תמונה',
    uploadPhoto: 'העלה תמונה',
    switchCamera: 'החלף מצלמה',
    capture: 'צלם',
    retake: 'צלם מחדש',
    usePhoto: 'השתמש בתמונה',

    // Preview
    preview: 'תצוגה מקדימה',
    print: 'הדפס',
    back: 'חזור',

    // Print
    printSent: 'התמונה נשלחה להדפסה!',
    printMessage: 'התמונה שלך נשלחה למדפסת. אספו אותה בעמדה!',
    printAnother: 'הדפס תמונה נוספת',
    remainingPrints: 'הדפסות נותרו',
    noPrintsLeft: 'לא נותרו הדפסות',
    maxPrintsReached: 'הגעת למספר ההדפסות המקסימלי לאירוע זה.',

    // Admin
    admin: 'לוח בקרה',
    createEvent: 'צור אירוע',
    eventName: 'שם האירוע',
    eventDate: 'תאריך האירוע',
    selectTemplate: 'בחר תבנית',
    overlayText: 'טקסט על התמונה',
    maxPrints: 'מקסימום הדפסות למכשיר',
    save: 'שמור',
    cancel: 'ביטול',
    events: 'אירועים',
    active: 'פעיל',
    inactive: 'לא פעיל',
    printQueue: 'תור הדפסה',
    totalPhotos: 'סה"כ תמונות',
    qrCode: 'קוד QR',
    deleteEvent: 'מחק אירוע',
    editEvent: 'ערוך אירוע',

    // Common
    loading: 'טוען...',
    error: 'משהו השתבש',
    switchLang: 'ENG',
  },
} as const;

export function t(locale: Locale, key: keyof typeof translations['en']): string {
  return translations[locale][key] || translations['en'][key];
}
