import oauthProvider from "./oauth";

// https://discord.com/developers/docs/topics/oauth2
export default oauthProvider({
  name: "discord",
  authorizeUrl: "https://discord.com/oauth2/authorize",
  tokenUrl: "https://discord.com/api/oauth2/token",
  profileUrl: "https://discord.com/api/users/@me",
  scope: "identify email",
  profile: (p) => ({
    id: p.id,
    email: p.email,
    name: p.global_name || p.username,
    picture: p.avatar
      ? `https://cdn.discordapp.com/avatars/${p.id}/${p.avatar}.png`
      : undefined,
  }),
});
