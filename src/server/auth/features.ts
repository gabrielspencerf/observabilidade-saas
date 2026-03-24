export const authFeatures = {
  get passwordResetEnabled(): boolean {
    return process.env.AUTH_PASSWORD_RESET_ENABLED === "true";
  },
  get googleLoginEnabled(): boolean {
    return process.env.AUTH_GOOGLE_LOGIN_ENABLED === "true";
  },
  get rememberMeEnabled(): boolean {
    return process.env.AUTH_REMEMBER_ME_ENABLED === "true";
  },
} as const;
