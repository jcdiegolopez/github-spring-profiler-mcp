# GitHub Spring Repository Profiler MCP

A lightweight remote MCP (Model Context Protocol) server deployed on Cloudflare Workers.

Its single tool, `profile_github_repository`, accepts a public GitHub repository URL, queries the GitHub public API, and returns a compact profile to help users decide whether a repository is suitable for deep local analysis with the Spring Architecture Analyzer MCP.

## Tool

| Tool | Description |
|---|---|
| `profile_github_repository` | Profile a public GitHub repository: check for pom.xml, src/main/java, Java files, and Spring layer annotations. |

### Returned profile

- Repository name and default branch
- Latest commit SHA when available
- Whether `pom.xml` exists
- Whether `src/main/java` exists
- Number of Java source files found
- Detected Spring layer annotations
- Whether the repository is suitable for local deep analysis

## Transport

This server runs over HTTP/SSE on Cloudflare Workers. The chatbot connects to it via the deployed Cloudflare Workers URL.

## Deployment

```bash
npx wrangler deploy
```

## Related repositories

- RD-PR01 (https://github.com/jcdiegolopez/RD-PR01) - Main chatbot MCP host (private)
- spring-architecture-analyzer-mcp (https://github.com/jcdiegolopez/spring-architecture-analyzer-mcp) - Custom local MCP server
