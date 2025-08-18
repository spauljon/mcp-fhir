curl -i -X POST http://localhost:8070/mcp \
  -H "Content-Type: application/json" \
  -H 'Accept: application/json, text/event-stream' \
  -H "Mcp-Session-Id: $SID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
