import oauthProvider from "./oauth";

// https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
export default oauthProvider({
  name: "microsoft",
  authorizeUrl:
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  profileUrl: "https://graph.microsoft.com/v1.0/me",
  scope: "openid email profile User.Read",
  profile: (p) => ({
    // Personal accounts expose `userPrincipalName` rather than `mail`
    id: p.id,
    email: p.mail || p.userPrincipalName,
    name: p.displayName,
  }),
});
