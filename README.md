# GitHub Spring Profiler MCP Server ☁️⚡

[![MCP Version](https://img.shields.io/badge/MCP-1.29.1-blue.svg)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange.svg)](https://workers.cloudflare.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-brightgreen.svg)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

A high-speed, serverless **Model Context Protocol (MCP)** remote server deployed on **Cloudflare Workers**.

Accepts any public GitHub repository URL, queries the GitHub REST API without cloning, and delivers an instant architectural pre-screening profile. It enables AI agents to evaluate whether a remote repository is a valid Spring Boot project before triggering deep local analysis.

---

## 🌐 Live Remote Endpoint

| Environment | Transport | URL |
|---|---|---|
| **Production** | HTTP / Streamable SSE | `https://github-spring-profiler-mcp.dijolopez.workers.dev/` |

---

## 🤖 For AI Agents & LLMs: Operational Guide & Tool Contract

### Purpose & When to Call

Call `profile_github_repository` when:
1. The user asks about an online GitHub repository (e.g. `https://github.com/spring-projects/spring-petclinic`).
2. You need to pre-screen a repository before recommending cloning or running deep local AST analysis.
3. You want to inspect high-level metadata (stars, default branch, Spring annotations, Maven POM presence) without downloading the codebase.

### Tool Specification

#### `profile_github_repository`

- **Parameters:**
  - `repo_url` *(string, required)*: The full HTTPS URL of the public GitHub repository (e.g., `https://github.com/spring-projects/spring-petclinic` or `owner/repo`).
- **Response Format:** JSON string containing the profile object.

```json
{
  "repository": "spring-projects/spring-petclinic",
  "url": "https://github.com/spring-projects/spring-petclinic",
  "default_branch": "main",
  "stars": 7532,
  "has_pom_xml": true,
  "has_maven_wrapper": true,
  "has_src_main_java": true,
  "java_file_count": 30,
  "detected_annotations": [
    "@SpringBootApplication",
    "@Controller",
    "@Entity",
    "@Component"
  ],
  "is_spring_boot_candidate": true,
  "recommendation": "Repository is a valid Spring Boot Maven project suitable for local architecture analysis."
}
```

---

## 👤 For Developers: Installation & Deployment

### Prerequisites

- **Node.js 18+** & `npm`
- **Cloudflare Account** (free tier is fully supported)
- **Wrangler CLI** (installed locally via npm)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/jcdiegolopez/github-spring-profiler-mcp.git
cd github-spring-profiler-mcp

npm install
```

### 2. Local Development

Run the worker locally in development mode:

```bash
npx wrangler dev
```

### 3. Deploy to Cloudflare Workers

Deploy your own instance to Cloudflare's global edge network:

```bash
npx wrangler deploy
```

*(Optional)* If you want higher GitHub API rate limits, configure a GitHub personal access token as a Cloudflare secret:

```bash
npx wrangler secret put GITHUB_TOKEN
```

---

## ⚙️ MCP Host Configuration

To connect this remote MCP server to your chatbot or IDE host:

### For Custom Hosts (e.g. `mcp_servers.json`)

```json
{
  "mcpServers": {
    "github-profiler": {
      "transport": "http",
      "url": "https://github-spring-profiler-mcp.dijolopez.workers.dev/"
    }
  }
}
```

### For Claude Desktop / Cursor / Antigravity

In environments supporting remote HTTP MCP transports:

```json
{
  "mcpServers": {
    "github-spring-profiler": {
      "transport": "sse",
      "url": "https://github-spring-profiler-mcp.dijolopez.workers.dev/sse"
    }
  }
}
```

---

## 🔗 Related Repositories

- [RD-PR01](https://github.com/jcdiegolopez/RD-PR01): Interactive Console MCP Client & Chatbot host (Google Gemini Interactions API).
- [spring-architecture-analyzer-mcp](https://github.com/jcdiegolopez/spring-architecture-analyzer-mcp): Local Python MCP server for deep AST static analysis and dependency graph generation.

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
