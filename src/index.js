/**
 * GitHub Spring Repository Profiler — MCP Server
 * Deployed on Cloudflare Workers.
 *
 * Transport: MCP Streamable HTTP (JSON-RPC 2.0 over POST).
 * Tool:      profile_github_repository
 */

const SERVER_NAME = "GitHub Spring Repository Profiler";
const SERVER_VERSION = "1.0.0";
const PROTOCOL_VERSION = "2024-11-05";
const TOOL_NAME = "profile_github_repository";

async function fetchGitHub(path, token) {
  const url = `https://api.github.com${path}`;
  const headers = {
    "User-Agent": "github-spring-profiler-mcp/1.0",
    "Accept": "application/vnd.github.v3+json",
  };
  if (token) headers["Authorization"] = `token ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status} on ${path}: ${body.slice(0, 120)}`);
  }
  return res.json();
}

async function profileRepository(repoUrl, token) {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/?#\s]+)/);
  if (!match) throw new Error("Invalid GitHub URL. Expected: https://github.com/owner/repo");
  const [, owner, rawRepo] = match;
  const repo = rawRepo.replace(/\.git$/, "");

  const meta = await fetchGitHub(`/repos/${owner}/${repo}`, token);
  if (meta.private) throw new Error("Repository is private. Only public repos are supported.");
  const defaultBranch = meta.default_branch;
  const stars = meta.stargazers_count ?? 0;

  let latestCommit = "unavailable", latestMessage = "unavailable";
  try {
    const c = await fetchGitHub(`/repos/${owner}/${repo}/commits/${defaultBranch}`, token);
    latestCommit = c.sha.slice(0, 8);
    latestMessage = (c.commit?.message ?? "").split("\n")[0];
  } catch {}

  let hasPomXml = false, hasSrcMainJava = false, javaCount = 0, treeTruncated = false;
  let layers = { controller: false, service: false, repository: false };
  try {
    const tree = await fetchGitHub(`/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, token);
    treeTruncated = tree.truncated;
    const paths = (tree.tree ?? []).map(f => f.path);
    hasPomXml = paths.includes("pom.xml");
    hasSrcMainJava = paths.some(p => p.startsWith("src/main/java/"));
    const javaFiles = paths.filter(p => p.endsWith(".java"));
    javaCount = javaFiles.length;
    layers = {
      controller: javaFiles.some(p => /controller/i.test(p)),
      service:    javaFiles.some(p => /service/i.test(p)),
      repository: javaFiles.some(p => /repository/i.test(p)),
    };
  } catch {}

  const suitable = hasPomXml && hasSrcMainJava && javaCount > 0;
  return {
    repository: `${owner}/${repo}`,
    url: `https://github.com/${owner}/${repo}`,
    default_branch: defaultBranch,
    stars,
    latest_commit: latestCommit,
    latest_commit_message: latestMessage,
    has_pom_xml: hasPomXml,
    has_src_main_java: hasSrcMainJava,
    java_files_found: javaCount,
    detected_spring_layers: layers,
    tree_truncated: treeTruncated,
    is_suitable_for_local_analysis: suitable,
    analysis_suggestion: suitable
      ? `Clone with: git clone https://github.com/${owner}/${repo}.git`
      : "This repository does not appear to be a Maven Spring Boot project.",
  };
}

function ok(id, result) {
  return Response.json({ jsonrpc: "2.0", id, result });
}
function mcpErr(id, code, message) {
  return Response.json({ jsonrpc: "2.0", id, error: { code, message } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET") {
      return Response.json({
        name: SERVER_NAME, version: SERVER_VERSION,
        protocol: "MCP Streamable HTTP",
        tool: TOOL_NAME,
        endpoint: `${url.origin}/`,
      });
    }

    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    let body;
    try { body = await request.json(); }
    catch { return mcpErr(null, -32700, "Parse error"); }

    const { method, id, params } = body;

    if (method === "initialize") {
      return ok(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        instructions: "Call profile_github_repository with a public GitHub repo URL to check if it is a Maven Spring Boot project suitable for the Spring Architecture Analyzer.",
      });
    }

    if (method === "notifications/initialized" || method === "ping") {
      return new Response(null, { status: 204 });
    }

    if (method === "tools/list") {
      return ok(id, {
        tools: [{
          name: TOOL_NAME,
          description: "Profile a public GitHub repository to determine if it looks like a Maven Spring Boot project. Checks for pom.xml, src/main/java, Java source files, and Spring layer class-name patterns (Controller, Service, Repository). Returns a compact JSON profile including a suitability flag and the clone command for local analysis.",
          inputSchema: {
            type: "object",
            properties: {
              repo_url: { type: "string", description: "Full public GitHub URL, e.g. https://github.com/spring-projects/spring-petclinic" },
            },
            required: ["repo_url"],
          },
        }],
      });
    }

    if (method === "tools/call") {
      if (params?.name !== TOOL_NAME) return mcpErr(id, -32601, `Unknown tool: ${params?.name ?? "(none)"}`);
      const repoUrl = params?.arguments?.repo_url;
      if (!repoUrl) return ok(id, { content: [{ type: "text", text: JSON.stringify({ error: "repo_url is required" }) }], isError: true });
      try {
        const profile = await profileRepository(repoUrl, env.GITHUB_TOKEN);
        return ok(id, { content: [{ type: "text", text: JSON.stringify(profile, null, 2) }] });
      } catch (e) {
        return ok(id, { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }], isError: true });
      }
    }

    return mcpErr(id, -32601, `Method not found: ${method}`);
  },
};
