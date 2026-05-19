export function canLogin(username, password) {
  return username.trim().length > 0 && password.trim().length > 0;
}

export function canRegister(username, password, confirmPassword) {
  return username.trim().length > 0 && password.trim().length > 0 && password === confirmPassword;
}

export function canUpdateAccount(accountName, newPassword, confirmPassword) {
  const hasName = accountName.trim().length > 0;
  const wantsPasswordChange = newPassword.trim().length > 0 || confirmPassword.trim().length > 0;
  if (!hasName) return false;
  if (!wantsPasswordChange) return true;
  return newPassword.trim().length >= 6 && newPassword === confirmPassword;
}
