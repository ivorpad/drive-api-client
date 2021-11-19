export const getGoogleAccessToken = async () => {
  const { token } = await fetch(
    `http://localhost:9000/.netlify/functions/google-drive?eventType=token`
  ).then(r => r.json());
  return token;
}