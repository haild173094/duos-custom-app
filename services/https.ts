import AppConfig from '@app/config/app';

function shopifyRequest ({
  url,
  query,
  variables,
}: {
  url: string,
  query: string,
  variables: Record<string, any>,
}) {
  return new Promise((resolve) => {
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    })
      .then((res) => res.json())
      .then(res => {
        if (res.errors || !res || !res.data) {
          return resolve({ error: res.errors || 'No results found.' })
        }

        return resolve(res.data);
      })
      .catch(error => resolve({ error }));
  }) as Promise<Record<string, any>>;
}

export function storefrontRequest({ query, variables }: { query: string, variables?: Record<string, any> }) {
  return shopifyRequest({
    url: `shopify://storefront/api/${AppConfig.API_VERSION}/graphql.json`,
    query,
    variables,
  });
}

export function customerAccountRequest({ query, variables }: { query: string, variables?: Record<string, any> }) {
  return shopifyRequest({
    url: `shopify://customer-account/api/${AppConfig.API_VERSION}/graphql.json`,
    query,
    variables,
  });
}

function convertFetchResponse(response: any) {
  const data = {
    statusCode: response.status,
    ok: response.ok,
  };

  return new Promise(resolve => response.text()
    .then((res: any) => resolve({ ...data, json: response.status === 302 ? {} : parseJSON(res) }))
    .catch((error: any) => resolve({ json: error }))
  );
}

function parseJSON(response: any) {
  let data = {};

  try {
    data = JSON.parse(response && response.responseText || response);
  } catch (error) {
    data = { error };
  }

  return data;
}

export function request(endpoint: string, options?: Record<string, any>, isIgnoreErrors?: boolean): Promise<any> {
  const defaultHeaders = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  let queryString = '';

  if (options?.query) {
    const { query } = options;

    Object.keys(query).forEach(key => query[key] === undefined && delete query[key]);
    queryString = `?${new URLSearchParams(query)}`;
    delete options.query;
  }

  return new Promise((resolve, reject) => {
    const optionRequest = { ...options };
    optionRequest.headers = (options && options.headers) || defaultHeaders;

    fetch(`${endpoint}${queryString}`, optionRequest)
      .then(convertFetchResponse)
      .then((response: any) => {
        if (response.ok || isIgnoreErrors) {
          return resolve(response.json);
        }

        return reject(response.json);
      })
      .catch((error: Record<string, any>) => {
        reject(new Error(error.message));
      });
  });
}
