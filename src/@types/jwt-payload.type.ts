export type ResetPasswordTokenPayload = {
  sub: string;
  email: string;
  type: 'RESET_PASSWORD';
  iat: number;
  exp: number;
};
