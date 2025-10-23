import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '30s',
};

const TARGET = __ENV.TARGET_URL || 'http://localhost:4567/';

export default function () {
  const res = http.get(TARGET);
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
