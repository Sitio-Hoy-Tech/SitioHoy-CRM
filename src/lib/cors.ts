export function corsHeaders() {
  const isDev = process.env.NODE_ENV === "development";
  const origin = isDev ? "*" : (process.env.SITIOHOY_APP_URL ?? "*");
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
