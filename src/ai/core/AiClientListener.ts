import {AiClient} from "./AiClient.ts";

export interface AiClientListener {
    onStart: (aiClient: AiClient) => void,
    onStop: () => void,
    onError?: (error?:any) => void,
    onMessage: (bodyString: string) => void,
}
