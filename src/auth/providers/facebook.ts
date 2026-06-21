import oauthProvider from "./oauth";

// https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow
export default oauthProvider({
  name: "facebook",
  authorizeUrl: "https://www.facebook.com/v18.0/dialog/oauth",
  tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
  profileUrl: "https://graph.facebook.com/me?fields=id,name,email,picture",
  scope: "email public_profile",
  profile: (p) => ({
    id: p.id,
    email: p.email,
    name: p.name,
    picture: p.picture?.data?.url,
  }),
});
