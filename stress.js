import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "10s", target: 10 },  // ramp-up
    { duration: "30s", target: 50 },  // plateau
    { duration: "5s", target: 0 },    // ramp-down
  ],
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<1500"],
  },
};

const baseUrl = __ENV.BASE_URL || "http://127.0.0.1:3001";
const endpoint = __ENV.ENDPOINT || "/api/home";

export default function () {
  const url = `${baseUrl}${endpoint}`;
  const params = {
    headers: {
      "Content-Type": "application/json",
      "X-K6-Test": "1",
    },
  };

  const response = http.get(url, params);

  check(response, {
    "status é 200": (r) => r.status === 200,
    "tempo de resposta < 2s": (r) => r.timings.duration < 2000,
    "resposta tem conteúdo": (r) => r.body && r.body.length > 0,
  });

  sleep(0.5);
}
