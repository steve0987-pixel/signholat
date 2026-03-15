import { defineConfig, loadEnv } from "vite";
import { resolveAiRoute } from "./lib/ai/http.js";
import {
  createPeerActionForReport,
  getObjectDetailsById,
  getReportCommunityActivity
} from "./lib/backend/community.js";
import { fetchGeoAsrSource } from "./lib/geoasr/server.js";

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

function getPathname(req) {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    return url.pathname || "/";
  } catch {
    return "/";
  }
}

function decodeRouteValue(value) {
  try {
    return decodeURIComponent(String(value || "").trim());
  } catch {
    return String(value || "").trim();
  }
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
  registerRoute("onboarding-assistant", "/api/ai/onboarding-assistant");
}

function attachGeoAsrMiddleware(server, env) {
  const registerSource = (sourceKey) => {
    server.middlewares.use(`/api/geoasr/${sourceKey}`, async (req, res, next) => {
      if (req.method !== "GET") {
        sendJson(res, 405, { error: "Method not allowed" });
        return;
      }

      try {
        const result = await fetchGeoAsrSource(sourceKey, env);
        if (!result.ok) {
          sendJson(res, result.status || 500, { error: result.error || "GEOASR request failed" });
          return;
        }

        sendJson(res, 200, result.payload);
      } catch {
        sendJson(res, 500, { error: "Failed to fetch GEOASR data" });
      }
    });
  };

  registerSource("maktab44");
  registerSource("bogcha");
  registerSource("ssv");
}

function attachCommunityMiddleware(server, env) {
  server.middlewares.use(async (req, res, next) => {
    const pathname = getPathname(req);

    const reportCommunityMatch = pathname.match(/^\/api\/reports\/([^/]+)\/community$/);
    if (reportCommunityMatch) {
      if (req.method !== "GET") {
        sendJson(res, 405, { error: "Method not allowed" });
        return;
      }

      const reportId = decodeRouteValue(reportCommunityMatch[1]);
      const result = await getReportCommunityActivity(reportId, env);
      if (!result.ok) {
        sendJson(res, result.status || 500, { error: result.error || "Failed to load report community activity" });
        return;
      }

      sendJson(res, 200, result.data);
      return;
    }

    const reportPeerActionMatch = pathname.match(/^\/api\/reports\/([^/]+)\/peer-actions$/);
    if (reportPeerActionMatch) {
      if (req.method !== "POST") {
        sendJson(res, 405, { error: "Method not allowed" });
        return;
      }

      const reportId = decodeRouteValue(reportPeerActionMatch[1]);

      try {
        const payload = await readJsonBody(req);
        const result = await createPeerActionForReport(reportId, payload, env);
        if (!result.ok) {
          sendJson(res, result.status || 500, { error: result.error || "Failed to create peer action" });
          return;
        }

        sendJson(res, result.status || 201, result.data);
        return;
      } catch {
        sendJson(res, 400, { error: "Invalid JSON body" });
        return;
      }
    }

    const objectDetailsMatch = pathname.match(/^\/api\/objects\/([^/]+)$/);
    if (objectDetailsMatch) {
      if (req.method !== "GET") {
        sendJson(res, 405, { error: "Method not allowed" });
        return;
      }

      const objectId = decodeRouteValue(objectDetailsMatch[1]);
      const result = await getObjectDetailsById(objectId, env);
      if (!result.ok) {
        sendJson(res, result.status || 500, { error: result.error || "Failed to load object details" });
        return;
      }

      sendJson(res, 200, result.data);
      return;
    }

    next();
  });
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      {
        name: "internal-ai-routes",
        configureServer(server) {
          attachAiMiddleware(server, env);
          attachGeoAsrMiddleware(server, env);
          attachCommunityMiddleware(server, env);
        }
      }
    ],
    server: {
      host: true,
      port: 5173
    }
  };
});
