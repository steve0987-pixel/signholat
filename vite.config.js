import { defineConfig, loadEnv } from "vite";
import { resolveAiRoute } from "./lib/ai/http.js";

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });

    req.on("end", () => {
      if (!chunks.length) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function attachAiMiddleware(server, env) {
  const registerRoute = (routeName, pathname) => {
    server.middlewares.use(pathname, async (req, res, next) => {
      if (req.method !== "POST") {
        sendJson(res, 405, { error: "Method not allowed" });
        return;
      }

      try {
        const payload = await readJsonBody(req);
        const result = await resolveAiRoute(routeName, payload, { env });
        sendJson(res, 200, result);
      } catch {
        sendJson(res, 400, { error: "Invalid JSON body" });
      }
    });
  };

  registerRoute("duplicate-check", "/api/ai/duplicate-check");
  registerRoute("title-summary", "/api/ai/title-summary");
  registerRoute("priority-explanation", "/api/ai/priority-explanation");
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const bearer = env.GEOASR_BEARER_TOKEN || env.VITE_GEOASR_BEARER_TOKEN || "";
  const commonHeaders = {
    Accept: "application/json",
    "User-Agent": "PostmanRuntime/7.43.0"
  };

  return {
    plugins: [
      {
        name: "internal-ai-routes",
        configureServer(server) {
          attachAiMiddleware(server, env);
        }
      }
    ],
    server: {
      host: true,
      port: 5173,
      proxy: {
        "/geoasr/maktab44": {
          target: "https://duasr.uz",
          changeOrigin: true,
          secure: true,
          rewrite: () => "/api4/maktab44",
          headers: bearer ? { ...commonHeaders, Authorization: `Bearer ${bearer}` } : commonHeaders
        },
        "/geoasr/bogcha": {
          target: "https://duasr.uz",
          changeOrigin: true,
          secure: true,
          rewrite: () => "/api4/bogcha",
          headers: bearer ? { ...commonHeaders, Authorization: `Bearer ${bearer}` } : commonHeaders
        },
        "/geoasr/ssv": {
          target: "https://duasr.uz",
          changeOrigin: true,
          secure: true,
          rewrite: () => "/api4/ssv",
          headers: bearer ? { ...commonHeaders, Authorization: `Bearer ${bearer}` } : commonHeaders
        }
      }
    }
  };
});
