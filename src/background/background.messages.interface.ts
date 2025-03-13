import { DebugContextData } from "../devtools/DebugContextData.interface";

export interface BackgroundPageMessage {
    name: "init" | "detectedUmbApp" | "contextData";
    tabId?: number;
    message?: string;
    data?: {
        contexts?: DebugContextData[];
    };
}