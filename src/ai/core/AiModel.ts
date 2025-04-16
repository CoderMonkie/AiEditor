import {AiMessageListener} from "./AiMessageListener.ts";
import {AiClient} from "./AiClient.ts";
import {AiGlobalConfig} from "../AiGlobalConfig.ts";
import {AiModelConfig} from "./AiModelConfig.ts";
import {InnerEditor} from "../../core/AiEditor.ts";

type ModelsKey = keyof AiGlobalConfig['models'];

export abstract class AiModel {

    public editor: InnerEditor;
    public globalConfig: AiGlobalConfig;
    public aiModelName: string;
    public aiModelConfig: AiModelConfig;

    protected constructor(editor: InnerEditor, globalConfig: AiGlobalConfig, aiModelName: string) {
        this.editor = editor;
        this.globalConfig = globalConfig;
        this.aiModelName = aiModelName;
        this.aiModelConfig = globalConfig.models![aiModelName as ModelsKey];
    }

    chatWithPayload(payload: any, listener: AiMessageListener): void {
        const onSuccess = (url: string) => {
            const aiClient = this.createAiClient(url, listener);
            aiClient.start(typeof payload === "string" ? payload : JSON.stringify(payload))
        }
        const onFailure = () => {
            listener?.onStop();
        }

        if (this.globalConfig.onCreateClientUrl) {
            this.globalConfig.onCreateClientUrl(this.aiModelName, this.aiModelConfig, onSuccess, onFailure)
        } else {
            onSuccess(this.createAiClientUrl())
        }
    }


    chat(selectedText: string, prompt: string, listener: AiMessageListener): void {
        const onSuccess = (url: string) => {
            const aiClient = this.createAiClient(url, listener);
            // const finalPrompt = prompt.includes("{content}") ? prompt.split('{content}').join(selectedText) : `${selectedText ? selectedText + "\n" : ""}${prompt}`
            const finalPrompt = this.buildStructuredPrompt(selectedText, prompt);
            const payload = this.wrapPayload(finalPrompt);
            aiClient.start(typeof payload === "string" ? payload : JSON.stringify(payload))
        }

        const onFailure = () => {
            listener?.onStop();
        }

        if (this.globalConfig.onCreateClientUrl) {
            this.globalConfig.onCreateClientUrl(this.aiModelName, this.aiModelConfig, onSuccess, onFailure)
        } else {
            onSuccess(this.createAiClientUrl())
        }
    }

    protected readonly defaultAiRole = "你是一个专业的 AI 写作助手，你的任务是根据用户提供的内容和要求，生成高质量的对应领域相应风格的写作内容。";

    protected buildStructuredPrompt(selectedText: string, originalPrompt: string): string {
        const options = this.editor.aiEditor.options;
        const chatConfig = options.ai?.chatConfig || {};
        
        // 获取当前文档全文作为上下文
        const fullContentMd = this.editor.aiEditor.getMarkdown();

        function maybeArrayStringFormat(item: string | string[] | any, withIndent: string = ''): string {
            if (typeof item === 'string') {
                return item;
            } else if (Array.isArray(item)) {
                const str = item.map(c => `${withIndent}- ${c}`).join('\n');
                return withIndent ? '\n' + str : str;
            } else {
                return item ? item.toString() : '';
            }
        }
        
        // 构建XML-like结构化提示词
        return `
<role>
${chatConfig.role || this.defaultAiRole}
</role>

<context>
${fullContentMd}
</context>

<reference>
${maybeArrayStringFormat(chatConfig.reference) || ""}
</reference>

<format>
${maybeArrayStringFormat(chatConfig.format) || ""}
</format>

<constraints>
- reference 为参考文档，如有提供请参考
- context 为当前已完写的全文内容，如果有提供请参考
- content 为当前写作上下文，如果没有则使用全文内容
- 除翻译任务以外请保持语种一致
- 灵活运用 markdown 格式输出内容
- 恰当地灵活运用 Mermaid 或 PlantUML 等工具绘制各种相关图表
- 不要给出多余的对话和解释内容，只输出结果
${chatConfig.constraints ? '- 另外，要求：' + maybeArrayStringFormat(chatConfig.constraints, '  ') : ''}
</constraints>

<goal>
${originalPrompt}
</goal>

<content>
${selectedText}
</content>
        `.trim();
    }


    /**
     * 创建客户端链接 URL
     */
    abstract createAiClientUrl(): string;

    /**
     * 创建客户端
     */
    abstract createAiClient(url: string, listener: AiMessageListener): AiClient;

    /**
     * 封装消息，把 prompt 转换为协议需要的格式
     * @param prompt
     */
    abstract wrapPayload(prompt: string): any;


}
