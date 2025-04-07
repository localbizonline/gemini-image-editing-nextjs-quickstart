interface WebhookSenderProps<TRequest, TResponse> {
  url: string;
  data: TRequest;
  onSuccess: (response: TResponse) => void;
  onError: (error: string) => void;
  setIsLoading?: (loading: boolean) => void;
}

export async function sendWebhookRequest<TRequest, TResponse>({
  url,
  data,
  onSuccess,
  onError,
  setIsLoading
}: WebhookSenderProps<TRequest, TResponse>) {
  if (!url) {
    onError('Webhook URL is required');
    return;
  }

  if (setIsLoading) {
    setIsLoading(true);
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    const rawText = await response.text();
    let responseData: TResponse;

    try {
      responseData = JSON.parse(rawText);
    } catch (parseError) {
      throw new Error(`Failed to parse response as JSON. Raw response: ${rawText}, ${parseError}`);
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    onSuccess(responseData);
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Unknown error occurred');
  } finally {
    if (setIsLoading) {
      setIsLoading(false);
    }
  }
}

export type { WebhookSenderProps }; 