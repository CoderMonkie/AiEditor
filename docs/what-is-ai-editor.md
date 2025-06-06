# What is AiEditor



## Introduction

> AiEditor is a next-generation rich text editor for AI. It is developed based on Web Component and therefore supports almost any front-end framework such as  Vue, React, Angular, Svelte, etc. It is adapted to PC Web and mobile terminals, and provides two themes: light and dark. In addition, it also provides flexible configuration, and developers can easily use it to develop any text editing application.



## Why develop AiEditor

Now, the AI era has arrived, and AIGC is booming.

In 2023, we started to choose a suitable AI rich text editor for our products, and we found excellent products such as CKEditor, TinyMCE, and Tiptap. However, they have more or less the following problems:

- CKEditor and TinyMCE are both based on the GPL open source agreement, and the open source agreement is not friendly.
- Tiptap is a headless editor, and a lot of additional development work needs to be done based on it when using it.

**The most important thing is:**
> When using the AI functions of editors such as CKEditor, TinyMCE, and Tiptap, you must use their **_paid_** plug-ins and AI cloud services. In this case, the applications will face many limitations if we develop based on it.
> For example: we cannot be deployed privately and not use private LLM apiKey, etc.

Therefore, I decided to develop AiEditor to solve the above problems.

## Positioning of AiEditor

1. Our original intention in developing AiEditor was to solve AI editing problems. Therefore, in terms of AI, AiEditor supports the use of private apiKey to connect to any LLMs, including ChatGPT, iFlytek Spark and any privatized LLM.
2. We hope that AiEditor has more usage scenarios and is not limited to any UI rendering framework, such as Vue, React, Angular, Svelte, etc.  Therefore, we developed it based on Web Component, which can be well integrated with any framework.
3. We provide a friendly UI, support two themes, light and dark, support the writing habit of using Markdown, support flexible function configuration and custom layout, and use the open source protocol LGPL, which is more friendly than CKEditor and TinyMCE.
4. In addition, we will continue to learn from excellent products, such as Notion, etc., to provide a series of useful AI functions... Of course, AiEditor is still evolving, and we need your support.


## Open source

After more than a year of development, AIEditor has released more than 30 versions and has become a very complete rich text editor.

| Function | Description                                                                                                                                                                                           |
|------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Basic functions** | Title, text, font, font size, bold, italics, underline, strikethrough, link, inline code, superscript, subscript, dividing line, quote, print                                                         |
| **Enhanced Features** | Undo, Redo, Format Painter, Eraser (clear format), To-Do List, Font Color, Background Color, Emoji, Alignment, Line Height, With (or without) Sequence List, Paragraph Indentation, forced line breaks |
| **Attachment function** | Supports pictures, videos, and file functions, supports selection upload, paste upload, drag and drop upload, and drag resize...                                                                      |
| **Code function** | Inline code, code block, language type selection, **AI automatic annotation**, **AI code explanation**...                                                                                             |
| **Markdown** | Titles, quotes, tables, pictures, code blocks, **highlight blocks (similar to vuepress's `:::` )**, various lists, bold, italics, strikethrough...                                                    |
| **AI Function** | AI continuation, AI optimization, AI proofreading, AI translation, customized AI menu and its Prompts                                                                                                 |
| **More features** | Internationalization, light theme, dark theme, mobile adaptation, full-screen editing, @someone (mentioned)...                                                                                 |


At the same time, AIEditor also launched a commercial version, providing more powerful functions, such as:
- Team collaboration
- Word import and export, Word export supports large file export of more than 500 pages, supports automatic conversion of IFrame in the editor to image export, etc.
- PDF export, supports automatic conversion of IFrame in the editor to image.
- Notion-like drag and drop sorting function
- Powerful annotation (comment) function
  - Supports line annotation
  - Supports image annotation
  - Supports reply annotation
  - Supports modification and deletion of annotations
- Supports @someone  in the annotation, etc.
- AI dialogue function, dialogue with AI while creating, support direct dialogue by selecting context...

> If you are looking for a powerful AI rich text editor and related services, trust us, we are very professional!
>
> At present, we have served many listed companies and financial companies in China, as well as many customers in the United States and Europe.

Click [here](https://aieditor.dev/price) to learn more about the commercial version and its price.

### Github
-  https://github.com/aieditor-team/aieditor
