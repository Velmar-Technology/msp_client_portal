import { j } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function fixLiteral() {
  const s18 = await j('GET', '/api/stacks/18/file');
  let content = s18.json.StackFileContent;

  const bot1Old = `        server {
            listen 80;
            server_name bot.mitefree.net;

            client_max_body_size 10M;

            location = / {
                proxy_pass http://10.13.13.3:3001/health;
                proxy_http_version 1.1;
                proxy_set_header Host $host;
                proxy_read_timeout 60s;
                proxy_send_timeout 60s;
            }

            location / {
                proxy_pass http://10.13.13.3:3001;
                proxy_http_version 1.1;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto https;
                proxy_read_timeout 3600s;
                proxy_send_timeout 3600s;
            }
        }`;

  const bot1New = `        server {
            listen 80;
            server_name bot.mitefree.net;

            client_max_body_size 10M;

            location = / {
                proxy_pass http://10.13.13.3:3001/health;
                proxy_http_version 1.1;
                proxy_set_header Host $$host;
                proxy_read_timeout 60s;
                proxy_send_timeout 60s;
            }

            location / {
                proxy_pass http://10.13.13.3:3001;
                proxy_http_version 1.1;
                proxy_set_header Host $$host;
                proxy_set_header X-Real-IP $$remote_addr;
                proxy_set_header X-Forwarded-For $$proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto https;
                proxy_read_timeout 3600s;
                proxy_send_timeout 3600s;
            }
        }`;

  const bot2Old = `        server {
            listen 80;
            server_name bot2.mitefree.net;

            client_max_body_size 10M;

            location = / {
                proxy_pass http://10.13.13.3:3002/health;
                proxy_http_version 1.1;
                proxy_set_header Host $host;
                proxy_read_timeout 60s;
                proxy_send_timeout 60s;
            }

            location / {
                proxy_pass http://10.13.13.3:3002;
                proxy_http_version 1.1;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto https;
                proxy_read_timeout 3600s;
                proxy_send_timeout 3600s;
            }
        }`;

  const bot2New = `        server {
            listen 80;
            server_name bot2.mitefree.net;

            client_max_body_size 10M;

            location = / {
                proxy_pass http://10.13.13.3:3002/health;
                proxy_http_version 1.1;
                proxy_set_header Host $$host;
                proxy_read_timeout 60s;
                proxy_send_timeout 60s;
            }

            location / {
                proxy_pass http://10.13.13.3:3002;
                proxy_http_version 1.1;
                proxy_set_header Host $$host;
                proxy_set_header X-Real-IP $$remote_addr;
                proxy_set_header X-Forwarded-For $$proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto https;
                proxy_read_timeout 3600s;
                proxy_send_timeout 3600s;
            }
        }`;

  content = content.replace(bot1Old, bot1New).replace(bot2Old, bot2New);

  const updateRes = await j('PUT', '/api/stacks/18?endpointId=3', {
    StackFileContent: content,
    prune: false,
    pullImage: false,
    env: []
  });
  console.log('Update status:', updateRes.status);
}

await fixLiteral();
