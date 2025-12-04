import { useEffect, useState } from 'react';
// [语法: import] 引入 TDesign 的组件
// Button: 按钮组件
// MessagePlugin: 全局提示插件
// Card: 卡片组件，用于容器布局
// Space: 间距组件，用于控制元素间隔
// Divider: 分割线
// Loading: 加载状态组件
import { CloudDownloadIcon, ErrorCircleIcon, CheckCircleIcon } from 'tdesign-icons-react';
import { Button, MessagePlugin, Card, Space, Divider } from 'tdesign-react';
// [语法: import] 引入 TDesign 的图标

/**
 * Popup 组件
 * 插件的弹窗主入口
 * [功能] 负责展示UI，检测当前URL，并触发数据抓取逻辑
 */
const Popup = () => {
  // [语法: useState] 状态管理
  // isCozeUrl: [Boolean] 当前是否在 Coze 模板页面
  const [isCozeUrl, setIsCozeUrl] = useState(false);
  // loading: [Boolean] 是否正在抓取数据中
  const [loading, setLoading] = useState(false);

  /**
   * [功能] 组件加载时执行的副作用
   * 用于检测当前标签页的 URL 是否符合要求
   */
  useEffect(() => {
    // [语法: async/await] 异步函数定义
    const checkUrl = async () => {
      // [语法: 解构赋值] 从数组中取出第一个元素
      // [功能] 获取当前激活的标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // [语法: Optional Chaining (?.)] 安全访问属性，防止 undefined 报错
      // [功能] 判断 URL 是否包含目标地址
      if (tab?.url?.includes('https://www.coze.cn/template')) {
        setIsCozeUrl(true);
      } else {
        setIsCozeUrl(false);
      }
    };
    checkUrl();
  }, []); // [语法: Dependency Array] 空数组表示只在组件挂载时执行一次

  /**
   * [功能] 抓取数据的核心逻辑
   * 注意：此函数会被序列化并注入到页面中执行，因此不能引用组件外部的变量
   */
  const scrapeData = () => {
    // [功能] 获取页面上所有的文章卡片元素
    const cards = document.querySelectorAll('article');

    // [语法: Array.from] 将 NodeList 转换为数组，以便使用 map 方法
    const data = Array.from(cards).map(card => {
      // [功能] 内部辅助函数：安全获取元素文本
      const getText = (selector: string) => {
        // [语法: Type Assertion (as)] 类型断言，告诉 TS 这是一个 HTMLElement
        const el = card.querySelector(selector) as HTMLElement;
        return el ? el.innerText.trim() : '';
      };

      // [功能] 内部辅助函数：安全获取元素属性
      const getAttr = (selector: string, attr: string) => {
        const el = card.querySelector(selector);
        return el ? el.getAttribute(attr) || '' : '';
      };

      // [功能] 构造数据对象
      return {
        bgImg: getAttr('.semi-image-img', 'src'), // 背景图
        appType: getText('.semi-tag span'), // 应用类型
        title: getText('.semi-typography-ellipsis-single-line'), // 标题
        author: getText('.semi-space .semi-typography span'), // 作者
        desc: getText('.semi-typography-ellipsis-multiple-line'), // 描述
        price: getText('.justify-between > div:first-child'), // 价格
        copyCount: getText('.justify-between > div:last-child span:first-child'), // 复制次数
      };
    });
    return data;
  };

  /**
   * [功能] 将数据转换为 CSV 格式并触发下载
   * @param data 抓取到的数据数组
   */
  interface TemplateData {
    bgImg: string;
    appType: string;
    title: string;
    author: string;
    desc: string;
    price: string;
    copyCount: string;
    [key: string]: string; // 允许索引访问
  }

  /**
   * [功能] 将数据转换为 CSV 格式并触发下载
   * @param data 抓取到的数据数组
   */
  const downloadCsv = (data: TemplateData[]) => {
    if (!data || data.length === 0) {
      MessagePlugin.warning('未获取到数据，请确认页面加载完成');
      return;
    }

    // [语法: Object.keys] 获取表头（对象的键名）
    const headers = Object.keys(data[0]);

    // [功能] 构建 CSV 字符串
    const csvContent = [
      headers.join(','), // 第一行：表头
      ...data.map(row =>
        headers
          .map(fieldName => {
            // [功能] 处理内容中的特殊字符（如英文逗号、双引号），防止 CSV 格式错乱
            const content = String(row[fieldName] || '').replace(/"/g, '""');
            return `"${content}"`; // 用双引号包裹每个字段
          })
          .join(','),
      ),
    ].join('\n'); // 用换行符连接每一行

    // [功能] 创建 Blob 对象，指定类型为 CSV
    // \uFEFF 是 BOM (Byte Order Mark)，用于告诉 Excel 这是一个 UTF-8 编码的文件，防止中文乱码
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // [功能] 创建隐藏的 a 标签触发下载
    const link = document.createElement('a');
    link.href = url;
    // [语法: Template Literal] 模板字符串，动态生成文件名
    link.download = `coze_templates_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    // [功能] 释放 URL 对象，避免内存泄漏
    URL.revokeObjectURL(url);
    MessagePlugin.success(`成功获取 ${data.length} 条数据并已下载`);
  };

  /**
   * [功能] 处理点击事件
   * 包含主要的业务流程控制
   */
  const handleScrape = async () => {
    setLoading(true);
    // [功能] 使用 TDesign 的全局提示
    const msgInstance = MessagePlugin.loading('正在获取数据...', 0); // 0 表示不自动关闭

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) return;

      // [功能] 使用 chrome.scripting API 在当前标签页执行脚本
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scrapeData, // 指定要执行的函数
      });

      const data = results[0]?.result;
      MessagePlugin.close(msgInstance); // 关闭 loading 提示
      if (data) {
        downloadCsv(data as TemplateData[]);
      }
    } catch (error) {
      console.error(error);
      MessagePlugin.close(msgInstance);
      MessagePlugin.error('获取数据失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // [功能] 渲染 UI
  return (
    <div
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: '20px',
        backgroundColor: 'var(--td-bg-color-container)',
        minHeight: '300px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}>
      <Card bordered={false} shadow={false}>
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* 标题区域 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* [功能] 显示 Logo，使用 / 开头的绝对路径引用 public 目录下的资源 */}
            <img src="/icon-34.png" alt="Logo" style={{ width: '24px', height: '24px', marginRight: '8px' }} />
            <h3 style={{ margin: 0, color: 'var(--td-text-color-primary)' }}>Spider Manual</h3>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          {/* 状态显示区域 */}
          <div
            style={{
              textAlign: 'center',
              padding: '12px',
              backgroundColor: isCozeUrl ? 'var(--td-brand-color-light)' : 'var(--td-error-color-light)',
              borderRadius: 'var(--td-radius-default)',
              color: isCozeUrl ? 'var(--td-brand-color)' : 'var(--td-error-color)',
            }}>
            <Space align="center">
              {isCozeUrl ? <CheckCircleIcon /> : <ErrorCircleIcon />}
              <span style={{ fontSize: '14px' }}>{isCozeUrl ? '环境检测通过' : '环境不匹配'}</span>
            </Space>
          </div>

          {/* 操作区域 */}
          {isCozeUrl ? (
            <Button
              theme="primary"
              variant="base"
              block
              size="large"
              icon={<CloudDownloadIcon />}
              loading={loading}
              onClick={handleScrape}>
              {loading ? '正在获取...' : '一键获取模板数据'}
            </Button>
          ) : (
            <Button
              theme="danger"
              variant="outline"
              block
              size="large"
              onClick={() => window.open('https://www.coze.cn/template', '_blank')}>
              前往 Coze 模板页
            </Button>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default Popup;
