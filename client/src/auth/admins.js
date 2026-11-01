// Who may use the admin portal (/admin) and see every purchase. The server decides
// (Config.ADMIN_EMAILS) and sends `isAdmin` with the logged-in user; the API checks it
// again on every admin request, so changing it in the browser unlocks nothing.
export function isAdmin(user) {
  return user?.isAdmin === true
}
