export class AIChatStream {
  public static async streamMessage(
    textResponse: string,
    onChunk: (currentText: string) => void,
    chunkDelayMs = 25
  ): Promise<string> {
    const tokens = textResponse.split(' ');
    let currentText = '';

    for (let i = 0; i < tokens.length; i++) {
      currentText += (i === 0 ? '' : ' ') + tokens[i];
      onChunk(currentText);
      await new Promise((resolve) => setTimeout(resolve, chunkDelayMs));
    }

    return currentText;
  }
}
