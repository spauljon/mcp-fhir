curl -i -X POST http://localhost:8070/mcp \
  -H "Content-Type: application/json" \
  -H 'Accept: application/json, text/event-stream' \
  -H "Mcp-Session-Id: $SID" \
  -d '{
    "jsonrpc":"2.0",
    "id":3,
    "method":"tools/call",
    "params":{
      "name":"fhir.search_observations",
      "arguments":{
        "patientId":"test-patient-0001",
        "code":"40443-4",
        "since":"2025-07-01T00:00:00.000Z",
        "count":1,
        "maxItems":1
      }
    }
  }'