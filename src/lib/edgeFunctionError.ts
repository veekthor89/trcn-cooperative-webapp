export const getEdgeFunctionErrorMessage = async (
  error: unknown,
  fallbackMessage: string,
): Promise<string> => {
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  const response = (error as Error & { context?: Response }).context;
  if (response instanceof Response) {
    try {
      const payload = await response.clone().json();
      if (typeof payload?.error === "string" && payload.error.trim().length > 0) {
        return payload.error;
      }
      if (typeof payload?.message === "string" && payload.message.trim().length > 0) {
        return payload.message;
      }
    } catch {
      // ignore JSON parse errors
    }

    try {
      const text = await response.clone().text();
      if (text.trim().length > 0) {
        return text;
      }
    } catch {
      // ignore text parse errors
    }
  }

  if (error.message && error.message !== "Edge Function returned a non-2xx status code") {
    return error.message;
  }

  return fallbackMessage;
};
