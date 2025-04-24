/**
 * 通用下载工具函数
 */

/**
 * 下载文件
 * @param content 文件内容
 * @param filename 文件名
 * @param mimeType 文件MIME类型
 */
export const downloadFile = (content: string, filename: string, mimeType: string) => {
    // 创建Blob对象
    const blob = new Blob([content], { type: mimeType });
    
    // 创建下载链接
    const url = URL.createObjectURL(blob);
    
    // 创建a标签并设置属性
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // 添加到文档中并触发点击
    document.body.appendChild(link);
    link.click();
    
    // 清理
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * 下载HTML内容
 * @param html HTML内容
 * @param filename 文件名，默认为document.html
 */
export const downloadHtml = (html: string, filename: string = 'document.html') => {
    // 添加基本的HTML结构
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${filename}</title>
</head>
<body>
${html}
</body>
</html>`;
    
    downloadFile(fullHtml, filename, 'text/html');
};

/**
 * 下载Markdown内容
 * @param markdown Markdown内容
 * @param filename 文件名，默认为document.md
 */
export const downloadMarkdown = (markdown: string, filename: string = 'document.md') => {
    downloadFile(markdown, filename, 'text/markdown');
};