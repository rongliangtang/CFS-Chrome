/**
 * 界面操作方法
 *
 * 描述：
 * 在 OneDrive 网页中，由于用户点击或刷新操作，页面结构可能发生变化，
 * 导致相同的元素在不同情况下对应的 CSS 选择器不同。
 * 因此，需要提供一组可能的选择器，依次尝试获取目标元素。
 *
 * 该函数接受一个包含多个 CSS 选择器的数组，依次尝试每个选择器，
 * 返回第一个匹配的元素。如果所有选择器都未匹配到元素，则返回 null。
 *
 * @param {string[]} selectors - 包含可能的 CSS 选择器的数组
 * @returns {Element|null} - 返回匹配的元素，如果未找到则返回 null
 */
function elementBySelectors(selectors) {
    if (!Array.isArray(selectors) || selectors.length === 0) {
      console.error('elementBySelectors: 参数必须是非空的选择器数组');
      return null;
    }
  
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          // 找到匹配的元素
          // console.log(`元素已找到，使用选择器: ${selector}`);
          return element;
        }
      } catch (error) {
        // 捕获选择器语法错误，继续尝试下一个选择器
        console.error(`无效的选择器 "${selector}":`, error);
        continue;
      }
    }
  
    // 未找到匹配的元素
    return null;
  }
  