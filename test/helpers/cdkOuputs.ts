import {readFile} from "node:fs/promises";
import {resolve} from "node:path";

type CdkOutput = {
    CdkCrusadeStack: {
        apiUrl: string;
    }
}

export async function cdkOutputs(): Promise<CdkOutput> {
  const cdkOutput = await readFile(resolve(__dirname, "..", "..", "cdk-outputs.json"), "utf-8");
  return JSON.parse(cdkOutput);
}

const outputs  = cdkOutputs();

export async function urlForPath(path: string) {
    const {CdkCrusadeStack: {apiUrl}} = await outputs;
    return `${apiUrl}${path}`
}
