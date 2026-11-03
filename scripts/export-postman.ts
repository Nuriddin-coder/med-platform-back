import * as fs from 'fs';
import * as path from 'path';

function generatePostmanCollection() {
  const openApiPath = path.resolve(process.cwd(), 'contract', 'openapi.json');
  if (!fs.existsSync(openApiPath)) {
    console.error('openapi.json not found!');
    process.exit(1);
  }

  const openApiDoc = JSON.parse(fs.readFileSync(openApiPath, 'utf-8'));

  const collection: Record<string, any> = {
    info: {
      name: 'MED Healthcare Platform API',
      description: 'MED Healthcare Platform API Contract Postman Collection',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    auth: {
      type: 'bearer',
      bearer: [
        {
          key: 'token',
          value: '{{accessToken}}',
          type: 'string',
        },
      ],
    },
    variable: [
      {
        key: 'baseUrl',
        value: 'http://localhost:4000/api/v1',
        type: 'string',
      },
      {
        key: 'accessToken',
        value: '',
        type: 'string',
      },
    ],
    item: [],
  };

  const tagFolders = new Map<string, any[]>();

  for (const [pathStr, methods] of Object.entries(openApiDoc.paths as Record<string, any>)) {
    for (const [method, op] of Object.entries(methods as Record<string, any>)) {
      if (['get', 'post', 'put', 'patch', 'delete'].indexOf(method) === -1) {
        continue;
      }

      const tag = (op.tags && op.tags[0]) || 'General';
      if (!tagFolders.has(tag)) {
        tagFolders.set(tag, []);
      }

      // Convert path params: /api/v1/users/{id} -> {{baseUrl}}/users/:id
      const relativePath = pathStr.replace(/^\/api\/v1/, '');
      const postmanUrlPath = relativePath
        .replace(/\{([^}]+)\}/g, ':$1')
        .split('/')
        .filter(Boolean);

      const requestItem: Record<string, any> = {
        name: op.summary || `${method.toUpperCase()} ${pathStr}`,
        request: {
          method: method.toUpperCase(),
          header: [
            {
              key: 'Accept',
              value: 'application/json',
              type: 'text',
            },
          ],
          url: {
            raw: `{{baseUrl}}${relativePath.replace(/\{([^}]+)\}/g, ':$1')}`,
            host: ['{{baseUrl}}'],
            path: postmanUrlPath,
          },
        },
      };

      if (['post', 'put', 'patch'].includes(method) && op.requestBody) {
        const content = op.requestBody.content || {};
        if (content['application/json']) {
          requestItem.request.header.push({
            key: 'Content-Type',
            value: 'application/json',
            type: 'text',
          });
          requestItem.request.body = {
            mode: 'raw',
            raw: '{\n  \n}',
            options: {
              raw: {
                language: 'json',
              },
            },
          };
        } else if (content['multipart/form-data']) {
          requestItem.request.body = {
            mode: 'formdata',
            formdata: [
              {
                key: 'file',
                type: 'file',
                src: '',
              },
            ],
          };
        }
      }

      tagFolders.get(tag)!.push(requestItem);
    }
  }

  for (const [tagName, items] of tagFolders.entries()) {
    collection.item.push({
      name: tagName,
      item: items,
    });
  }

  const outputPath = path.resolve(process.cwd(), 'contract', 'med-platform.postman_collection.json');
  fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2), 'utf-8');
  console.log(`✓ Postman collection generated at: ${outputPath}`);
}

generatePostmanCollection();

