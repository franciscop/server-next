import oauthProvider from "./oauth";

// https://developers.google.com/identity/openid-connect/openid-connect
export default oauthProvider({
  name: "google",
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  profileUrl: "https://openidconnect.googleapis.com/v1/userinfo",
  scope: "openid email profile",
  profile: (p) => ({
    id: p.sub,
    email: p.email,
    name: p.name,
    picture: p.picture,
  }),
});
