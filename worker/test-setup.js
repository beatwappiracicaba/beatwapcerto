
const url = 'https://beatwap-api-worker.beatwappiracicaba.workers.dev/setup/ensure-tables';

async function test() {
  try {
    console.log(`Fetching ${url}...`);
    const response = await fetch(url);
    console.log(`Status: ${response.status}`);
    const text = await response.text();
    console.log(`Response: ${text.substring(0, 500)}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
