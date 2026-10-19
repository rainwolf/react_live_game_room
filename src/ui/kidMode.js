// Kid status is read from the login echo only (me.parentPid). The UI that
// depends on it is cosmetic: the server enforces every kid restriction.
export const isKidLogin = (me) =>
  !!me && typeof me === 'object' && me.parentPid !== undefined && me.parentPid !== null;

export const KID_CHAT_HINT = 'Only players your parent approved will see your messages.';
export const KIDS_PAGE_URL = 'https://www.pente.org/gameServer/myprofile/kids';
export const KIDS_LINK_TEXT = 'Kid accounts';
