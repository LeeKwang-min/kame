interface IFetchProps {
  url: string;
  options: RequestInit;
}

const customFetch = async ({ url, options = {} }: IFetchProps) => {
  const isClient = typeof window !== 'undefined';

  const { headers, ...restOptions } = options;
  const defaultHeader: RequestInit = {
    headers: {
      ...headers,
    },
  };
  const option = {
    ...defaultHeader,
    ...restOptions,
  };

  // const toAbsoluteUrl = (input: string) => {
  //   try {
  //     return new URL(input).toString(); // 이미 절대 URL이면 그대로
  //   } catch {
  //     const base = process.env.NEXT_PUBLIC_BASE_URL;
  //     return new URL(input, base).toString();
  //   }
  // };

  const response = await fetch(url, option);
  // const response = await fetch(toAbsoluteUrl(url), option);

  if (isClient && !response.ok) {
    const error = await response.json();
    return Promise.reject({
      message: error.detail,
      code: response.status,
    });
  }

  return response;
};

export async function request<T>({ url, options }: IFetchProps) {
  const response = await customFetch({
    url,
    options: {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    },
  });
  const body: T = await response.json();

  return {
    ...body,
    ok: response.ok,
    code: response.status,
  };
}
